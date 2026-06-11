import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService, AiMessage } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';
import { LeadsService } from '../../leads/leads.service';
import { CustomersService } from '../../customers/customers.service';
import { Lead, LeadPlatform, LeadStatus } from '../../../database/entities/lead.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';

const SALES_SYSTEM_PROMPT = `Bạn là AI bán hàng chuyên nghiệp của shop.
Nhiệm vụ:
- Tư vấn sản phẩm phù hợp với nhu cầu khách
- So sánh sản phẩm một cách trung thực
- Chốt đơn tự nhiên, không ép buộc
- Luôn cung cấp link affiliate khi có
- Ngắn gọn, thân thiện, dùng tiếng Việt

Khi khách muốn mua: hỏi địa chỉ, số điện thoại để tạo đơn hàng.`;

export interface ChatContext {
  sessionId: string;
  platform: LeadPlatform;
  platformUserId: string;
  customerName?: string;
  messages: AiMessage[];
}

@Injectable()
export class SalesAgentService {
  private readonly logger = new Logger(SalesAgentService.name);
  private readonly sessions = new Map<string, ChatContext>();

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    private readonly leadsService: LeadsService,
    private readonly customersService: CustomersService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  async handleMessage(params: {
    sessionId: string;
    platform: LeadPlatform;
    platformUserId: string;
    message: string;
    customerName?: string;
  }): Promise<{ reply: string; sessionId: string }> {
    let context = this.sessions.get(params.sessionId);
    if (!context) {
      context = {
        sessionId: params.sessionId,
        platform: params.platform,
        platformUserId: params.platformUserId,
        customerName: params.customerName,
        messages: [],
      };
      this.sessions.set(params.sessionId, context);
    }

    context.messages.push({ role: 'user', content: params.message });

    // Giữ tối đa 20 tin nhắn
    if (context.messages.length > 20) {
      context.messages = context.messages.slice(-20);
    }

    const enrichedPrompt = await this.buildContextPrompt(params.message);
    const messagesWithContext = context.messages.slice(0, -1).concat([
      { role: 'user', content: enrichedPrompt },
    ]);

    const result = await this.aiService.chat(messagesWithContext, SALES_SYSTEM_PROMPT);
    context.messages.push({ role: 'assistant', content: result.content });

    await this.saveLead(context, params.message);

    return { reply: result.content, sessionId: params.sessionId };
  }

  private async buildContextPrompt(userMessage: string): Promise<string> {
    const keywords = userMessage.toLowerCase();
    let productContext = '';

    if (keywords.includes('sản phẩm') || keywords.includes('mua') || keywords.includes('giá')) {
      const products = await this.productsService.getHotProducts(5);
      if (products.length > 0) {
        productContext = '\n\n[Sản phẩm đang hot]:\n' + products
          .map((p) => `- ${p.name}: ${p.price?.toLocaleString('vi-VN')}đ | ${p.affiliateLink || 'chưa có link'}`)
          .join('\n');
      }
    }

    return userMessage + productContext;
  }

  private async saveLead(context: ChatContext, message: string): Promise<void> {
    const score = this.calculateLeadScore(message);
    try {
      await this.leadsService.create({
        platform: context.platform,
        platformUserId: context.platformUserId,
        name: context.customerName,
        content: message,
        score,
        intent: score >= 70 ? 'buy' : score >= 40 ? 'consider' : 'browse',
        status: LeadStatus.NEW,
      });
    } catch {}
  }

  private calculateLeadScore(message: string): number {
    const text = message.toLowerCase();
    let score = 30;
    if (['mua', 'đặt hàng', 'chốt', 'lấy', 'ship'].some((k) => text.includes(k))) score += 40;
    if (['giá bao nhiêu', 'bao tiền', 'giá'].some((k) => text.includes(k))) score += 20;
    if (['địa chỉ', 'số điện thoại', 'thanh toán'].some((k) => text.includes(k))) score += 30;
    return Math.min(score, 100);
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
