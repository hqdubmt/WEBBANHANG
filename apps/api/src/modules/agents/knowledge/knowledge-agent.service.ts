import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { Knowledge, KnowledgeStatus, KnowledgeType } from '../../../database/entities/knowledge.entity';
import { AiService } from '../../ai/ai.service';
import { RagService, RagCollection } from '../../rag/rag.service';

@Injectable()
export class KnowledgeAgentService {
  private readonly logger = new Logger(KnowledgeAgentService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly ragService: RagService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
    @InjectRepository(Knowledge)
    private readonly knowledgeRepo: Repository<Knowledge>,
  ) {}

  @Cron('0 3 * * *')
  async runDailySync() {
    this.logger.log('Knowledge Agent: đồng bộ knowledge base...');
    await this.syncKnowledgeBase();
  }

  async syncKnowledgeBase(): Promise<Record<string, any>> {
    const log = this.logRepo.create({ agent: AgentName.KNOWLEDGE, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const pending = await this.knowledgeRepo.find({
        where: { status: KnowledgeStatus.ACTIVE, isIndexed: false },
        take: 100,
      });

      let indexed = 0;
      for (const item of pending) {
        await this.indexKnowledge(item);
        indexed++;
      }

      const result = { total: pending.length, indexed };

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: result as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Knowledge Agent: đã index ${indexed} tài liệu`);
      return result;
    } catch (e) {
      this.logger.error('Knowledge Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return { indexed: 0, error: e.message };
    }
  }

  async addKnowledge(data: {
    type: KnowledgeType;
    title: string;
    content: string;
    sourceId?: string;
    tags?: string[];
  }): Promise<Knowledge> {
    const item = this.knowledgeRepo.create({
      ...data,
      status: KnowledgeStatus.ACTIVE,
      isIndexed: false,
    });
    const saved = await this.knowledgeRepo.save(item);
    await this.indexKnowledge(saved);
    return saved;
  }

  async search(query: string, type?: KnowledgeType): Promise<Record<string, any>> {
    const collections = type
      ? [this.typeToCollection(type)]
      : [RagCollection.PRODUCTS, RagCollection.FAQ, RagCollection.MARKETING];

    const context = await this.ragService.retrieveContext(query, collections);

    if (!context) {
      return { query, answer: 'Không tìm thấy thông tin liên quan.', sources: [] };
    }

    const answer = await this.aiService.generate(
      `Dựa vào thông tin sau, trả lời câu hỏi: "${query}"\n\nThông tin:\n${context}`,
      'Bạn là trợ lý tri thức bán hàng. Trả lời ngắn gọn, chính xác bằng tiếng Việt.',
    );

    return { query, answer, context };
  }

  private async indexKnowledge(item: Knowledge): Promise<void> {
    try {
      const collection = this.typeToCollection(item.type as KnowledgeType);
      await this.ragService.upsert(
        collection,
        item.id,
        `${item.title}\n${item.content}`,
        { title: item.title, type: item.type, sourceId: item.sourceId, tags: item.tags },
      );

      await this.knowledgeRepo.update(item.id, {
        isIndexed: true,
        collection,
        indexedAt: new Date(),
      });
    } catch (e) {
      this.logger.warn(`Không thể index knowledge ${item.id}: ${e.message}`);
    }
  }

  private typeToCollection(type: KnowledgeType): RagCollection {
    const map: Record<KnowledgeType, RagCollection> = {
      [KnowledgeType.PRODUCT]: RagCollection.PRODUCTS,
      [KnowledgeType.FAQ]: RagCollection.FAQ,
      [KnowledgeType.POLICY]: RagCollection.FAQ,
      [KnowledgeType.TRAINING]: RagCollection.FAQ,
      [KnowledgeType.MARKETING]: RagCollection.MARKETING,
      [KnowledgeType.AFFILIATE]: RagCollection.AFFILIATE,
      [KnowledgeType.CUSTOMER]: RagCollection.CUSTOMERS,
    };
    return map[type] || RagCollection.FAQ;
  }

  async getStats(): Promise<Record<string, any>> {
    const total = await this.knowledgeRepo.count();
    const indexed = await this.knowledgeRepo.count({ where: { isIndexed: true } });
    const pending = await this.knowledgeRepo.count({ where: { isIndexed: false, status: KnowledgeStatus.ACTIVE } });

    const byType = await this.knowledgeRepo
      .createQueryBuilder('k')
      .select('k.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('k.type')
      .getRawMany();

    return { total, indexed, pending, byType };
  }
}
