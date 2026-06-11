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

  @Cron('0 8,12,18 * * *')
  async runAutoPublish() {
    this.logger.log('Publisher Agent: bắt đầu đăng bài tự động...');
    await this.publishPendingContent();
  }

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
        const platform = content.platform || 'facebook';
        const result = await this.publishToChannel(platform as string, content);
        results.push(result);

        if (result.success) {
          await this.contentRepo.update(content.id, {
            status: 'published' as any,
            platformPostId: result.postId,
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
      case 'facebook':
        return this.publishFacebook(content);
      case 'telegram':
        return this.publishTelegram(content);
      case 'tiktok':
        return this.publishTikTok(content);
      default:
        return { platform, success: false, error: `Platform không hỗ trợ: ${platform}` };
    }
  }

  private async publishFacebook(content: Content): Promise<PublishResult> {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const token = process.env.FACEBOOK_ACCESS_TOKEN;

    if (!pageId || !token) {
      return { platform: 'facebook', success: false, error: 'Chưa cấu hình Facebook API' };
    }

    try {
      const { data } = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/feed`,
        { message: content.body, access_token: token },
      );
      return { platform: 'facebook', success: true, postId: data.id };
    } catch (e) {
      return { platform: 'facebook', success: false, error: e.response?.data?.error?.message || e.message };
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
