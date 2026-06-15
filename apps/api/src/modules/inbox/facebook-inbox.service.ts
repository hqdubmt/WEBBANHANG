import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import {
  InboxConversation, InboxChannel, ConversationStatus,
} from '../../database/entities/inbox-conversation.entity';
import { InboxMessage, MessageDirection, MessageStatus } from '../../database/entities/inbox-message.entity';

@Injectable()
export class FacebookInboxService {
  private readonly logger = new Logger(FacebookInboxService.name);
  private readonly token = process.env.FB_PAGE_TOKEN ?? '';
  private readonly verifyToken = process.env.FB_VERIFY_TOKEN ?? 'commerce_verify';

  constructor(
    @InjectRepository(InboxConversation)
    private readonly convRepo: Repository<InboxConversation>,
    @InjectRepository(InboxMessage)
    private readonly msgRepo: Repository<InboxMessage>,
  ) {}

  // ─── Webhook verification (GET) ──────────────────────────────────────────

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) return challenge;
    return null;
  }

  // ─── Webhook event handler (POST) ────────────────────────────────────────

  async handleWebhook(body: any): Promise<void> {
    if (body?.object !== 'page') return;

    for (const entry of body.entry ?? []) {
      for (const event of entry.messaging ?? []) {
        if (event.message) {
          await this.handleMessage(event);
        }
      }
    }
  }

  private async handleMessage(event: any): Promise<void> {
    const senderId: string = event.sender?.id;
    const text: string = event.message?.text ?? '';
    const mid: string = event.message?.mid ?? '';

    if (!senderId) return;

    const conv = await this.upsertConversation(senderId);

    await this.msgRepo.save(
      this.msgRepo.create({
        conversationId: conv.id,
        direction: MessageDirection.INBOUND,
        content: text,
        senderId,
        externalId: mid,
        status: MessageStatus.RECEIVED,
        meta: { raw: event.message },
      }),
    );

    await this.convRepo.update(conv.id, {
      lastMessage: text.slice(0, 200),
      lastMessageAt: new Date(),
      unreadCount: () => '"unreadCount" + 1',
    });

    this.logger.log(`FB inbox: message from ${senderId}`);
  }

  private async upsertConversation(senderId: string): Promise<InboxConversation> {
    const existing = await this.convRepo.findOne({
      where: { channel: InboxChannel.FACEBOOK, externalId: senderId },
    });
    if (existing) return existing;

    const profile = await this.fetchProfile(senderId);
    return this.convRepo.save(
      this.convRepo.create({
        channel: InboxChannel.FACEBOOK,
        externalId: senderId,
        customerName: profile?.name ?? senderId,
        customerAvatar: profile?.profile_pic ?? null,
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
        unreadCount: 1,
      }),
    );
  }

  private async fetchProfile(psid: string): Promise<any> {
    if (!this.token) return null;
    try {
      const { data } = await axios.get(
        `https://graph.facebook.com/${psid}?fields=name,profile_pic&access_token=${this.token}`,
        { timeout: 5000 },
      );
      return data;
    } catch {
      return null;
    }
  }

  // ─── Reply ───────────────────────────────────────────────────────────────

  async reply(conversationId: string, text: string): Promise<boolean> {
    const conv = await this.convRepo.findOneBy({ id: conversationId });
    if (!conv || !this.token) return false;

    try {
      await axios.post(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${this.token}`,
        { recipient: { id: conv.externalId }, message: { text } },
      );

      await this.msgRepo.save(
        this.msgRepo.create({
          conversationId,
          direction: MessageDirection.OUTBOUND,
          content: text,
          status: MessageStatus.REPLIED,
        }),
      );

      await this.convRepo.update(conv.id, {
        lastMessage: text.slice(0, 200),
        lastMessageAt: new Date(),
      });

      return true;
    } catch (e) {
      this.logger.error(`FB reply error: ${e.message}`);
      return false;
    }
  }
}
