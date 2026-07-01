import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { Content } from '../../../database/entities/content.entity';
import { AiService } from '../../ai/ai.service';

export interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
}

@Injectable()
export class PublisherAgentService {
  private readonly logger = new Logger(PublisherAgentService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
  ) {}

  // Tắt: TelegramAgentService đăng trực tiếp từ AT campaigns, không dùng DB draft queue
  // @Cron('0 8,12,18 * * *')
  // async runAutoPublish() { ... }

  async publishPendingContent(): Promise<PublishResult[]> {
    const log = this.logRepo.create({ agent: AgentName.PUBLISHER, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();
    const results: PublishResult[] = [];

    try {
      const { ContentStatus } = await import('../../../database/entities/content.entity');
      const pending = await this.contentRepo.find({
        where: { status: ContentStatus.DRAFT },
        order: { createdAt: 'ASC' },
        take: 20,
      });

      for (const content of pending) {
        // Bỏ qua content chứa Tiki link (ti.ki NXDOMAIN — deeplink v5 Tiki chết)
        if (content.body?.includes('tiki.vn') || content.body?.includes('tiki%2')) {
          await this.contentRepo.update(content.id, { status: 'cancelled' as any });
          continue;
        }
        // Đăng lên Telegram + Discord (Facebook yêu cầu Business Verification)
        const tgResult = await this.publishTelegram(content);
        const dcResult = await this.publishDiscord(content);
        results.push(tgResult, dcResult);

        if (tgResult.success || dcResult.success) {
          await this.contentRepo.update(content.id, {
            status: 'published' as any,
            platformPostId: tgResult.postId || dcResult.postId,
            publishedAt: new Date(),
          });
        }
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { total: pending.length, results } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Publisher Agent: đã đăng ${results.filter((r) => r.success).length}/${results.length} bài`);
      return results;
    } catch (e) {
      this.logger.error('Publisher Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return results;
    }
  }

  async publishToChannel(platform: string, content: Content): Promise<PublishResult> {
    switch (platform) {
      case 'telegram':
        return this.publishTelegram(content);
      case 'discord':
        return this.publishDiscord(content);
      default:
        return this.publishTelegram(content);
    }
  }

  private async publishDiscord(content: Content): Promise<PublishResult> {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      return { platform: 'discord', success: false, error: 'Chưa cấu hình Discord webhook' };
    }
    try {
      const text = content.title ? `**${content.title}**\n\n${content.body}` : content.body;
      await axios.post(webhookUrl, { content: text.slice(0, 2000) });
      return { platform: 'discord', success: true };
    } catch (e) {
      return { platform: 'discord', success: false, error: e.response?.data?.message || e.message };
    }
  }

  private async publishTelegram(content: Content): Promise<PublishResult> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken || !channelId) {
      return { platform: 'telegram', success: false, error: 'Chưa cấu hình Telegram Bot' };
    }

    try {
      const text = content.title ? `*${content.title}*\n\n${content.body}` : content.body;
      const { data } = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        { chat_id: channelId, text, parse_mode: 'Markdown' },
      );
      return { platform: 'telegram', success: true, postId: String(data.result.message_id) };
    } catch (e) {
      return { platform: 'telegram', success: false, error: e.response?.data?.description || e.message };
    }
  }

  private async publishTikTok(content: Content): Promise<PublishResult> {
    return { platform: 'tiktok', success: false, error: 'TikTok publishing chưa hỗ trợ - cần OAuth flow' };
  }

  async getPublishStats(): Promise<Record<string, any>> {
    const { ContentStatus } = await import('../../../database/entities/content.entity');
    const total = await this.contentRepo.count();
    const published = await this.contentRepo.count({ where: { status: ContentStatus.PUBLISHED } });
    const draft = await this.contentRepo.count({ where: { status: ContentStatus.DRAFT } });

    return { total, published, draft, publishRate: total ? Math.round((published / total) * 100) : 0 };
  }
}
