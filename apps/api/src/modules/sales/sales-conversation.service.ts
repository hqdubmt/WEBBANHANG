import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AiService, AiMessage } from '../ai/ai.service';
import { Lead, LeadPlatform, LeadStatus } from '../../database/entities/lead.entity';
import { ProductDiscoveryService } from './product-discovery.service';

export type ConversationStage =
  | 'greeting'
  | 'qualification'
  | 'presentation'
  | 'objection_handling'
  | 'closing'
  | 'closed';

export interface SalesSession {
  id: string;
  stage: ConversationStage;
  leadId?: string;
  customerName?: string;
  platform: LeadPlatform;
  messages: AiMessage[];
  context: {
    budget?: number;
    interest?: string;
    objections: string[];
    closingAttempts: number;
  };
  createdAt: Date;
}

const STAGE_PROMPTS: Record<ConversationStage, string> = {
  greeting: `Chào hỏi thân thiện, hỏi thăm nhu cầu.`,
  qualification: `Đặt 1-2 câu hỏi để hiểu ngân sách, nhu cầu cụ thể, timeline mua hàng.`,
  presentation: `Giới thiệu 2-3 sản phẩm phù hợp, nêu lợi ích nổi bật, tránh spam thông tin.`,
  objection_handling: `Lắng nghe phản đối, đồng cảm rồi phản bác nhẹ nhàng bằng dữ kiện thực tế.`,
  closing: `Tóm tắt giá trị, tạo urgency tự nhiên (số lượng có hạn / ưu đãi hôm nay), đề nghị chốt.`,
  closed: `Cảm ơn, xác nhận đơn, hướng dẫn bước tiếp theo.`,
};

const BASE_SYSTEM = `Bạn là AI Sales của AI Commerce OS. Hành xử như nhân viên bán hàng chuyên nghiệp.
- Ngắn gọn (2-4 câu mỗi lượt), thân thiện, dùng tiếng Việt
- KHÔNG spam sản phẩm, chỉ giới thiệu khi khách hỏi hoặc đã đủ thông tin
- Khi khách muốn mua: hỏi tên, số điện thoại, địa chỉ
- Khi có link affiliate: đính kèm cuối tin nhắn`;

@Injectable()
export class SalesConversationService {
  private readonly logger = new Logger(SalesConversationService.name);
  private readonly sessions = new Map<string, SalesSession>();

  constructor(
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    private readonly aiService: AiService,
    private readonly productDiscovery: ProductDiscoveryService,
  ) {}

  // ─── Session lifecycle ────────────────────────────────────────────────────

  createSession(platform: LeadPlatform, customerName?: string): SalesSession {
    const session: SalesSession = {
      id: uuidv4(),
      stage: 'greeting',
      customerName,
      platform,
      messages: [],
      context: { objections: [], closingAttempts: 0 },
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): SalesSession | null {
    return this.sessions.get(id) ?? null;
  }

  // ─── Main chat handler ────────────────────────────────────────────────────

  async chat(sessionId: string, userMessage: string): Promise<{
    reply: string;
    stage: ConversationStage;
    sessionId: string;
  }> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSession(LeadPlatform.WEBSITE);
      this.sessions.set(sessionId, session);
    }

    session.messages.push({ role: 'user', content: userMessage });
    this.updateStage(session, userMessage);

    const systemPrompt = this.buildSystemPrompt(session);
    const contextMessages = session.messages.slice(-16);

    const response = await this.aiService.chat(contextMessages, systemPrompt);
    session.messages.push({ role: 'assistant', content: response.content });

    if (session.stage === 'closing') session.context.closingAttempts++;
    if (session.stage === 'closed') await this.saveLead(session);

    return { reply: response.content, stage: session.stage, sessionId };
  }

  // ─── Stage transitions ────────────────────────────────────────────────────

  private updateStage(session: SalesSession, message: string): void {
    const lower = message.toLowerCase();
    const current = session.stage;

    if (current === 'closed') return;

    // Detect objections
    if (/đắt|không cần|để sau|suy nghĩ|chưa|thôi/.test(lower)) {
      if (current !== 'objection_handling') {
        session.context.objections.push(message.slice(0, 100));
        session.stage = 'objection_handling';
        return;
      }
    }

    // Detect closing signals
    if (/mua|đặt|chốt|ok|được|đồng ý/.test(lower)) {
      session.stage = 'closing';
      return;
    }

    // Detect order confirmation
    if (/địa chỉ|số điện thoại|sdt|phone|tên.*:/.test(lower)) {
      session.stage = 'closed';
      return;
    }

    // Normal progression
    const progression: ConversationStage[] = [
      'greeting', 'qualification', 'presentation', 'objection_handling', 'closing', 'closed',
    ];
    const idx = progression.indexOf(current);
    if (idx < 2 && session.messages.length >= (idx + 1) * 3) {
      session.stage = progression[Math.min(idx + 1, 4)] as ConversationStage;
    }
  }

  private buildSystemPrompt(session: SalesSession): string {
    const stageInstruction = STAGE_PROMPTS[session.stage];
    const parts = [BASE_SYSTEM, `\nGiai đoạn hiện tại: ${session.stage.toUpperCase()}`, stageInstruction];

    if (session.context.objections.length) {
      parts.push(`\nPhản đối đã gặp: ${session.context.objections.join('; ')}`);
    }
    if (session.context.budget) {
      parts.push(`\nNgân sách khách: ${session.context.budget.toLocaleString('vi-VN')}đ`);
    }

    return parts.join('\n');
  }

  // ─── Save lead on close ───────────────────────────────────────────────────

  private async saveLead(session: SalesSession): Promise<void> {
    if (session.leadId) return;
    try {
      const lastMessages = session.messages.slice(-6).map((m) => m.content).join(' | ');
      const lead = await this.leadRepo.save(
        this.leadRepo.create({
          platform: session.platform,
          name: session.customerName,
          content: lastMessages.slice(0, 500),
          status: LeadStatus.CONVERTED,
          score: 90,
          intent: 'buy_now',
        }),
      );
      session.leadId = lead.id;
    } catch (e) {
      this.logger.warn(`saveLead error: ${e.message}`);
    }
  }

  // ─── Objection handling playbook ─────────────────────────────────────────

  async handleObjection(objection: string, productContext?: string): Promise<string> {
    const prompt = productContext
      ? `Khách hàng phản đối: "${objection}"\nSản phẩm đang bán: ${productContext}\nHãy xử lý phản đối ngắn gọn, thuyết phục.`
      : `Khách hàng phản đối: "${objection}"\nHãy xử lý phản đối ngắn gọn, thuyết phục.`;

    return this.aiService.generate(prompt, BASE_SYSTEM);
  }

  // ─── Closing script generator ─────────────────────────────────────────────

  async generateClosingScript(productName: string, price: number): Promise<string> {
    return this.aiService.generate(
      `Tạo 1 câu chốt đơn ngắn (2 câu) cho sản phẩm "${productName}" giá ${price.toLocaleString('vi-VN')}đ. Tạo urgency tự nhiên.`,
      'Bạn là copywriter sales chuyên nghiệp. Chỉ trả lời bằng 2 câu chốt đơn, không giải thích.',
    );
  }
}
