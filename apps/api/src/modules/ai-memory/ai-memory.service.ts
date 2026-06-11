import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiMemory, MemoryType } from '../../database/entities/ai-memory.entity';

@Injectable()
export class AiMemoryService {
  private readonly logger = new Logger(AiMemoryService.name);

  constructor(
    @InjectRepository(AiMemory)
    private readonly memoryRepo: Repository<AiMemory>,
  ) {}

  async saveChatMessage(customerId: string, sessionId: string, message: { role: string; content: string }): Promise<void> {
    const existing = await this.memoryRepo.findOne({
      where: { customerId, sessionId, type: MemoryType.CHAT_HISTORY },
    });

    if (existing) {
      const history = (existing.data.messages || []) as any[];
      history.push({ ...message, ts: new Date().toISOString() });
      await this.memoryRepo.update(existing.id, {
        data: { messages: history.slice(-50) },
      });
    } else {
      await this.memoryRepo.save(this.memoryRepo.create({
        customerId,
        sessionId,
        type: MemoryType.CHAT_HISTORY,
        data: { messages: [{ ...message, ts: new Date().toISOString() }] },
      }));
    }
  }

  async getChatHistory(customerId: string, sessionId: string): Promise<any[]> {
    const memory = await this.memoryRepo.findOne({
      where: { customerId, sessionId, type: MemoryType.CHAT_HISTORY },
    });
    return (memory?.data?.messages as any[]) || [];
  }

  async trackProductView(customerId: string, productId: string, productName: string): Promise<void> {
    const existing = await this.memoryRepo.findOne({
      where: { customerId, type: MemoryType.VIEWED_PRODUCTS },
    });

    const view = { productId, productName, viewedAt: new Date().toISOString() };

    if (existing) {
      const views = (existing.data.views || []) as any[];
      const deduped = views.filter((v: any) => v.productId !== productId);
      await this.memoryRepo.update(existing.id, {
        data: { views: [view, ...deduped].slice(0, 50) },
      });
    } else {
      await this.memoryRepo.save(this.memoryRepo.create({
        customerId,
        type: MemoryType.VIEWED_PRODUCTS,
        data: { views: [view] },
      }));
    }
  }

  async trackBehavior(customerId: string, event: string, data: Record<string, any>): Promise<void> {
    await this.memoryRepo.save(this.memoryRepo.create({
      customerId,
      type: MemoryType.CUSTOMER_BEHAVIOR,
      data: { event, ...data, ts: new Date().toISOString() },
      tags: [event],
    }));
  }

  async getPersonalizationContext(customerId: string): Promise<string> {
    const [views, behaviors] = await Promise.all([
      this.memoryRepo.findOne({ where: { customerId, type: MemoryType.VIEWED_PRODUCTS } }),
      this.memoryRepo.find({
        where: { customerId, type: MemoryType.CUSTOMER_BEHAVIOR },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
    ]);

    const parts: string[] = [];

    if (views?.data?.views?.length) {
      const recentViews = (views.data.views as any[]).slice(0, 5).map((v: any) => v.productName);
      parts.push(`Sản phẩm đã xem gần đây: ${recentViews.join(', ')}`);
    }

    if (behaviors.length) {
      const events = behaviors.map((b) => b.data.event).join(', ');
      parts.push(`Hành vi: ${events}`);
    }

    return parts.join('\n');
  }

  async clearSession(customerId: string, sessionId: string): Promise<void> {
    await this.memoryRepo.delete({ customerId, sessionId, type: MemoryType.CHAT_HISTORY });
  }
}
