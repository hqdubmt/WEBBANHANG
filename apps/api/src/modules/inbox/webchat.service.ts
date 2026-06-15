import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  InboxConversation, InboxChannel, ConversationStatus,
} from '../../database/entities/inbox-conversation.entity';
import { InboxMessage, MessageDirection, MessageStatus } from '../../database/entities/inbox-message.entity';

@Injectable()
export class WebChatService {
  private readonly logger = new Logger(WebChatService.name);

  // visitorId → conversationId (in-memory for speed; falls back to DB)
  private readonly sessionMap = new Map<string, string>();

  constructor(
    @InjectRepository(InboxConversation)
    private readonly convRepo: Repository<InboxConversation>,
    @InjectRepository(InboxMessage)
    private readonly msgRepo: Repository<InboxMessage>,
  ) {}

  // ─── Session Init ────────────────────────────────────────────────────────

  async startSession(visitorId?: string, visitorName?: string): Promise<InboxConversation> {
    const extId = visitorId ?? uuidv4();

    const existing = await this.convRepo.findOne({
      where: { channel: InboxChannel.WEB_CHAT, externalId: extId },
    });
    if (existing) {
      this.sessionMap.set(extId, existing.id);
      return existing;
    }

    const conv = await this.convRepo.save(
      this.convRepo.create({
        channel: InboxChannel.WEB_CHAT,
        externalId: extId,
        customerName: visitorName ?? 'Khách ẩn danh',
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
        unreadCount: 0,
      }),
    );

    this.sessionMap.set(extId, conv.id);
    return conv;
  }

  // ─── Receive visitor message ─────────────────────────────────────────────

  async receiveMessage(
    visitorId: string,
    text: string,
    meta?: Record<string, any>,
  ): Promise<{ conversationId: string; messageId: string }> {
    let conversationId = this.sessionMap.get(visitorId);
    if (!conversationId) {
      const conv = await this.convRepo.findOne({
        where: { channel: InboxChannel.WEB_CHAT, externalId: visitorId },
      });
      if (!conv) throw new Error(`Session ${visitorId} không tồn tại`);
      conversationId = conv.id;
      this.sessionMap.set(visitorId, conv.id);
    }

    const msg = await this.msgRepo.save(
      this.msgRepo.create({
        conversationId,
        direction: MessageDirection.INBOUND,
        content: text,
        senderId: visitorId,
        status: MessageStatus.RECEIVED,
        meta,
      }),
    );

    await this.convRepo.update(conversationId, {
      lastMessage: text.slice(0, 200),
      lastMessageAt: new Date(),
      unreadCount: () => '"unreadCount" + 1',
    });

    return { conversationId, messageId: msg.id };
  }

  // ─── Send agent reply ────────────────────────────────────────────────────

  async sendReply(conversationId: string, text: string, agentId?: string): Promise<InboxMessage> {
    const msg = await this.msgRepo.save(
      this.msgRepo.create({
        conversationId,
        direction: MessageDirection.OUTBOUND,
        content: text,
        senderId: agentId,
        senderName: agentId ? 'Agent' : 'AI Bot',
        status: MessageStatus.REPLIED,
      }),
    );

    await this.convRepo.update(conversationId, {
      lastMessage: text.slice(0, 200),
      lastMessageAt: new Date(),
      unreadCount: 0,
    });

    return msg;
  }

  // ─── Session messages ────────────────────────────────────────────────────

  async getMessages(conversationId: string, limit = 50): Promise<InboxMessage[]> {
    return this.msgRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }
}
