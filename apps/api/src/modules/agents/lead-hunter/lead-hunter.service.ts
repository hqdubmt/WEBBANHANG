import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { Lead, LeadPlatform, LeadStatus } from '../../../database/entities/lead.entity';
import { AiService } from '../../ai/ai.service';

export interface RawLead {
  platform: LeadPlatform;
  platformUserId?: string;
  name?: string;
  content: string;
  source?: string;
}

@Injectable()
export class LeadHunterService {
  private readonly logger = new Logger(LeadHunterService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
  ) {}

  @Cron('*/30 * * * *')
  async runLeadHunting() {
    this.logger.log('Lead Hunter: đang quét tìm leads...');
    await this.huntLeads();
  }

  async huntLeads(): Promise<Lead[]> {
    const log = this.logRepo.create({ agent: AgentName.LEAD, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const rawLeads = await this.collectFromSources();
      const processedLeads = await this.classifyAndScore(rawLeads);
      const savedLeads = await this.saveLeads(processedLeads);

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: {
          collected: rawLeads.length,
          saved: savedLeads.length,
          avgScore: savedLeads.length
            ? Math.round(savedLeads.reduce((s, l) => s + Number(l.score), 0) / savedLeads.length)
            : 0,
        } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Lead Hunter: tìm được ${savedLeads.length} leads`);
      return savedLeads;
    } catch (e) {
      this.logger.error('Lead Hunter lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  async ingestLead(raw: RawLead): Promise<Lead> {
    const [classified] = await this.classifyAndScore([raw]);
    const [saved] = await this.saveLeads([classified]);
    return saved;
  }

  private async collectFromSources(): Promise<RawLead[]> {
    const leads: RawLead[] = [];

    // Placeholder: trong thực tế sẽ gọi Facebook Graph API, Telegram webhook, etc.
    // Leads thực đến qua webhook endpoints được đẩy vào queue
    this.logger.log('Lead Hunter: chờ webhook leads từ Facebook, Telegram, Website...');

    return leads;
  }

  private async classifyAndScore(rawLeads: RawLead[]): Promise<(RawLead & { score: number; intent: string })[]> {
    if (!rawLeads.length) return [];

    const list = rawLeads.map((l, i) => `${i + 1}. [${l.platform}] ${l.name || 'Ẩn danh'}: "${l.content}"`).join('\n');

    const systemPrompt = `Bạn là chuyên gia phân loại lead bán hàng Việt Nam.
Phân tích từng lead và trả về JSON: [{"idx":1,"score":85,"intent":"mua ngay"}]
- score: 0-100 (khả năng mua hàng)
- intent: "mua ngay" | "tìm hiểu" | "so sánh giá" | "spam" | "khiếu nại"`;

    try {
      const results = await this.aiService.parseJson<Array<{ idx: number; score: number; intent: string }>>(
        `Phân tích leads:\n${list}`,
        systemPrompt,
      );

      return rawLeads.map((l, i) => {
        const r = results.find((x) => x.idx === i + 1) || results[i];
        return { ...l, score: r?.score ?? 50, intent: r?.intent ?? 'tìm hiểu' };
      });
    } catch {
      return rawLeads.map((l) => ({ ...l, score: 50, intent: 'tìm hiểu' }));
    }
  }

  private async saveLeads(
    leads: (RawLead & { score: number; intent: string })[],
  ): Promise<Lead[]> {
    const saved: Lead[] = [];

    for (const l of leads) {
      const existing = l.platformUserId
        ? await this.leadRepo.findOne({ where: { platformUserId: l.platformUserId, platform: l.platform } })
        : null;

      if (existing) {
        await this.leadRepo.update(existing.id, {
          content: l.content,
          score: l.score,
          intent: l.intent,
        });
        saved.push({ ...existing, score: l.score, intent: l.intent });
      } else {
        const lead = this.leadRepo.create({
          platform: l.platform,
          platformUserId: l.platformUserId,
          name: l.name,
          content: l.content,
          score: l.score,
          intent: l.intent,
          status: l.score >= 70 ? LeadStatus.QUALIFIED : LeadStatus.NEW,
          meta: { source: l.source },
        });
        const entity = await this.leadRepo.save(lead);
        saved.push(entity);
      }
    }

    return saved;
  }

  async getLeadStats(): Promise<Record<string, any>> {
    const total = await this.leadRepo.count();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLeads = await this.leadRepo.createQueryBuilder('l')
      .where('l.createdAt >= :today', { today })
      .getCount();

    const qualified = await this.leadRepo.count({ where: { status: LeadStatus.QUALIFIED } });
    const converted = await this.leadRepo.count({ where: { status: LeadStatus.CONVERTED } });

    return {
      total,
      todayLeads,
      qualified,
      converted,
      conversionRate: qualified ? Math.round((converted / qualified) * 100) : 0,
    };
  }
}
