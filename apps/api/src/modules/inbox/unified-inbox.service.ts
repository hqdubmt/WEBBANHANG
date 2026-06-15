import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InboxConversation, ConversationStatus, InboxChannel,
} from '../../database/entities/inbox-conversation.entity';
import { InboxMessage } from '../../database/entities/inbox-message.entity';

export interface InboxFilter {
  channel?: InboxChannel;
  status?: ConversationStatus;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class UnifiedInboxService {
  constructor(
    @InjectRepository(InboxConversation)
    private readonly convRepo: Repository<InboxConversation>,
    @InjectRepository(InboxMessage)
    private readonly msgRepo: Repository<InboxMessage>,
  ) {}

  // ─── Unified conversation list ────────────────────────────────────────────

  async listConversations(filter: InboxFilter = {}) {
    const { channel, status, assignedTo, page = 1, limit = 20 } = filter;

    const qb = this.convRepo.createQueryBuilder('c')
      .orderBy('c.lastMessageAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    if (channel)    qb.andWhere('c.channel = :channel', { channel });
    if (status)     qb.andWhere('c.status = :status', { status });
    if (assignedTo) qb.andWhere('c.assignedTo = :assignedTo', { assignedTo });

    const [conversations, total] = await qb.getManyAndCount();

    return {
      conversations,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ─── Conversation detail with messages ───────────────────────────────────

  async getConversation(id: string) {
    const [conv, messages] = await Promise.all([
      this.convRepo.findOneByOrFail({ id }),
      this.msgRepo.find({
        where: { conversationId: id },
        order: { createdAt: 'ASC' },
        take: 100,
      }),
    ]);

    // Mark as read
    if (conv.unreadCount > 0) {
      await this.convRepo.update(id, { unreadCount: 0 });
    }

    return { ...conv, messages };
  }

  // ─── Agent Routing ────────────────────────────────────────────────────────

  async assignConversation(conversationId: string, agentId: string): Promise<InboxConversation> {
    await this.convRepo.update(conversationId, {
      assignedTo: agentId,
      status: ConversationStatus.ASSIGNED,
    });
    return this.convRepo.findOneByOrFail({ id: conversationId });
  }

  async resolveConversation(conversationId: string): Promise<InboxConversation> {
    await this.convRepo.update(conversationId, { status: ConversationStatus.RESOLVED });
    return this.convRepo.findOneByOrFail({ id: conversationId });
  }

  // ─── Merge: link existing customer to conversation ────────────────────────

  async mergeCustomer(conversationId: string, customerId: string, customerName?: string): Promise<InboxConversation> {
    await this.convRepo.update(conversationId, {
      customerId,
      ...(customerName ? { customerName } : {}),
    });
    return this.convRepo.findOneByOrFail({ id: conversationId });
  }

  // ─── Inbox stats ──────────────────────────────────────────────────────────

  async getStats() {
    const [total, open, assigned, resolved] = await Promise.all([
      this.convRepo.count(),
      this.convRepo.count({ where: { status: ConversationStatus.OPEN } }),
      this.convRepo.count({ where: { status: ConversationStatus.ASSIGNED } }),
      this.convRepo.count({ where: { status: ConversationStatus.RESOLVED } }),
    ]);

    const byChannel = await this.convRepo
      .createQueryBuilder('c')
      .select('c.channel', 'channel')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.channel')
      .getRawMany();

    const unread = await this.convRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.unreadCount),0)', 'total')
      .getRawOne();

    return {
      total,
      open,
      assigned,
      resolved,
      unreadMessages: parseInt(unread?.total ?? '0'),
      byChannel: byChannel.map((r) => ({ channel: r.channel, count: parseInt(r.count) })),
    };
  }
}
