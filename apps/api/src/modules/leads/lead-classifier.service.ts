import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../../database/entities/lead.entity';
import { AiService } from '../ai/ai.service';

export type LeadIntent =
  | 'buy_now'
  | 'price_inquiry'
  | 'product_inquiry'
  | 'complaint'
  | 'general';

export interface ClassificationResult {
  intent: LeadIntent;
  score: number;
  confidence: number;
  reasoning: string;
}

@Injectable()
export class LeadClassifierService {
  private readonly logger = new Logger(LeadClassifierService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly repo: Repository<Lead>,
    private readonly aiService: AiService,
  ) {}

  // ─── Rule-based scoring (fast, no AI) ────────────────────────────────────

  scoreByRules(content: string, meta?: Record<string, any>): number {
    const lower = content.toLowerCase();
    let score = 20;

    // Buying intent signals
    if (/mua ngay|order ngay|đặt hàng|chốt đơn/.test(lower))   score += 40;
    else if (/muốn mua|quan tâm mua|cần mua/.test(lower))        score += 30;
    else if (/giá|bao nhiêu|ship|giao hàng/.test(lower))         score += 20;
    else if (/thông tin|hỏi|tư vấn/.test(lower))                 score += 10;

    // Contact info bonus
    if (meta?.phone)  score += 15;
    if (meta?.email)  score += 10;

    // UTM campaign bonus
    if (meta?.utm?.campaign) score += 5;

    // Negative signals
    if (/khiếu nại|tệ|không hài lòng|trả hàng/.test(lower)) score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  // ─── AI classification ────────────────────────────────────────────────────

  async classifyWithAi(content: string): Promise<ClassificationResult> {
    const intents: LeadIntent[] = [
      'buy_now', 'price_inquiry', 'product_inquiry', 'complaint', 'general',
    ];

    try {
      const result = await this.aiService.parseJson<ClassificationResult>(
        `Phân loại tin nhắn sau của khách hàng:
"${content}"

Trả về JSON với format:
{
  "intent": "<${intents.join('|')}>",
  "score": <0-100>,
  "confidence": <0-100>,
  "reasoning": "<lý do ngắn gọn>"
}

intent "buy_now" = muốn mua ngay (score 80-100)
intent "price_inquiry" = hỏi giá (score 50-70)
intent "product_inquiry" = hỏi sản phẩm (score 40-60)
intent "complaint" = khiếu nại (score 10-20)
intent "general" = khác (score 20-40)`,
        'Bạn là hệ thống phân loại lead. Chỉ trả về JSON hợp lệ.',
      );

      return {
        intent: intents.includes(result.intent) ? result.intent : 'general',
        score: Math.max(0, Math.min(100, result.score ?? 30)),
        confidence: Math.max(0, Math.min(100, result.confidence ?? 50)),
        reasoning: result.reasoning ?? '',
      };
    } catch (e) {
      this.logger.warn(`AI classify error: ${e.message}`);
      return {
        intent: this.ruleBasedIntent(content),
        score: this.scoreByRules(content),
        confidence: 60,
        reasoning: 'rule-based fallback',
      };
    }
  }

  private ruleBasedIntent(content: string): LeadIntent {
    const lower = content.toLowerCase();
    if (/mua ngay|đặt hàng|chốt/.test(lower))       return 'buy_now';
    if (/giá|bao nhiêu|ship/.test(lower))             return 'price_inquiry';
    if (/sản phẩm|hàng|chất lượng/.test(lower))      return 'product_inquiry';
    if (/khiếu nại|tệ|không hài/.test(lower))        return 'complaint';
    return 'general';
  }

  // ─── Classify and update a lead ──────────────────────────────────────────

  async classifyLead(leadId: string): Promise<Lead> {
    const lead = await this.repo.findOneByOrFail({ id: leadId });
    const result = await this.classifyWithAi(lead.content);

    await this.repo.update(lead.id, {
      intent: result.intent,
      score: result.score,
      meta: { ...(lead.meta ?? {}), classification: result as Record<string, any> },
    });

    return this.repo.findOneByOrFail({ id: leadId });
  }

  // ─── Batch classify new leads ─────────────────────────────────────────────

  async classifyNewLeads(limit = 20): Promise<{ processed: number; errors: number }> {
    const leads = await this.repo.find({
      where: { status: LeadStatus.NEW, intent: null as any },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    let processed = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        await this.classifyLead(lead.id);
        processed++;
      } catch {
        errors++;
      }
    }

    return { processed, errors };
  }
}
