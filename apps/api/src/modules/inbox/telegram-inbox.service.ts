import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import {
  InboxConversation, InboxChannel, ConversationStatus,
} from '../../database/entities/inbox-conversation.entity';
import { InboxMessage, MessageDirection, MessageStatus } from '../../database/entities/inbox-message.entity';

@Injectable()
export class TelegramInboxService {
  private readonly logger = new Logger(TelegramInboxService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN ?? '';

  constructor(
    @InjectRepository(InboxConversation)
    private readonly convRepo: Repository<InboxConversation>,
    @InjectRepository(InboxMessage)
    private readonly msgRepo: Repository<InboxMessage>,
  ) {}

  get apiBase() {
    return `https://api.telegram.org/bot${this.token}`;
  }

  // ─── Register webhook with Telegram ─────────────────────────────────────

  async registerWebhook(publicUrl: string): Promise<any> {
    if (!this.token) return { ok: false, error: 'No TELEGRAM_BOT_TOKEN' };
    const url = `${publicUrl}/api/inbox/telegram/webhook`;
    const { data } = await axios.post(`${this.apiBase}/setWebhook`, { url });
    return data;
  }

  // ─── Handle incoming update (POST) ───────────────────────────────────────

  async handleUpdate(update: any): Promise<void> {
    const message = update.message ?? update.edited_message;
    if (!message) return;

    const chatId = String(message.chat.id);
    const text: string = message.text ?? '';
    const from = message.from;

    const conv = await this.upsertConversation(chatId, from);

    await this.msgRepo.save(
      this.msgRepo.create({
        conversationId: conv.id,
        direction: MessageDirection.INBOUND,
        content: text,
        senderId: chatId,
        senderName: from?.first_name ?? chatId,
        externalId: String(message.message_id),
        status: MessageStatus.RECEIVED,
        meta: { raw: message },
      }),
    );

    await this.convRepo.update(conv.id, {
      lastMessage: text.slice(0, 200),
      lastMessageAt: new Date(),
      unreadCount: () => '"unreadCount" + 1',
    });

    this.logger.log(`Telegram inbox: message from chatId ${chatId}`);
  }

  private async upsertConversation(chatId: string, from: any): Promise<InboxConversation> {
    const existing = await this.convRepo.findOne({
      where: { channel: InboxChannel.TELEGRAM, externalId: chatId },
    });
    if (existing) return existing;

    const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || chatId;

    return this.convRepo.save(
      this.convRepo.create({
        channel: InboxChannel.TELEGRAM,
        externalId: chatId,
        customerName: name,
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
        unreadCount: 1,
        meta: { username: from?.username },
      }),
    );
  }

  // ─── Reply ───────────────────────────────────────────────────────────────

  async reply(conversationId: string, text: string): Promise<boolean> {
    const conv = await this.convRepo.findOneBy({ id: conversationId });
    if (!conv || !this.token) return false;

    try {
      await axios.post(`${this.apiBase}/sendMessage`, {
        chat_id: conv.externalId,
        text,
        parse_mode: 'HTML',
      });

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
      this.logger.error(`Telegram reply error: ${e.message}`);
      return false;
    }
  }
}
