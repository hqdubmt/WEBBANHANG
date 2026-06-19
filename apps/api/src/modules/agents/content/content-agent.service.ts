import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';
import { Content, ContentPlatform, ContentStatus } from '../../../database/entities/content.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';

interface GeneratedContent {
  title: string;
  content: string;
  hashtags: string[];
}

@Injectable()
export class ContentAgentService {
  private readonly logger = new Logger(ContentAgentService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  // Tạo + tự publish nội dung Telegram mỗi 3 giờ
  @Cron('0 7,10,13,16,19 * * *')
  async runDailyContentCreation() {
    this.logger.log('Content Agent: bắt đầu tạo nội dung...');
    const contents = await this.createBulkContent(5);
    // Auto-publish Telegram ngay
    for (const c of contents) {
      if (c.platform === ContentPlatform.TELEGRAM) {
        try {
          await this.publishContent(c.id);
        } catch {/* ignore */}
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  async createBulkContent(count = 10): Promise<Content[]> {
    const log = this.logRepo.create({ agent: AgentName.CONTENT, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const products = await this.productsService.getHotProducts(count);
      const created: Content[] = [];

      for (const product of products) {
        const platforms = [ContentPlatform.FACEBOOK, ContentPlatform.TELEGRAM, ContentPlatform.WEBSITE, ContentPlatform.TIKTOK];
        for (const platform of platforms) {
          const generated = await this.generateContent(product, platform);
          const content = this.contentRepo.create({
            productId: product.id,
            title: generated.title,
            body: generated.content,
            hashtags: generated.hashtags,
            platform,
            imageUrl: product.image,
            status: ContentStatus.DRAFT,
          });
          created.push(await this.contentRepo.save(content));
        }
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { created: created.length } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Content Agent: tạo ${created.length} bài đăng`);
      return created;
    } catch (e) {
      this.logger.error('Content Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  private async generateContent(product: any, platform: ContentPlatform): Promise<GeneratedContent> {
    const platformGuide: Record<ContentPlatform, string> = {
      [ContentPlatform.FACEBOOK]: 'bài Facebook thân thiện, kèm emoji, 300-500 ký tự',
      [ContentPlatform.TELEGRAM]: 'tin nhắn Telegram ngắn gọn, có bold, 150-250 ký tự',
      [ContentPlatform.WEBSITE]: 'bài viết blog SEO-friendly, đầy đủ thông tin, 500-800 ký tự',
      [ContentPlatform.TIKTOK]: 'kịch bản video TikTok, 60 giây, hook mạnh đầu',
    };

    const systemPrompt = `Bạn là copywriter chuyên bán hàng trên mạng xã hội Việt Nam.
Tạo nội dung bán hàng hấp dẫn, tự nhiên, không spam.
Trả về JSON: { "title": "", "content": "", "hashtags": [] }`;

    const prompt = `Tạo ${platformGuide[platform]} cho sản phẩm:
Tên: ${product.name}
Danh mục: ${product.category || 'Chung'}
Giá: ${product.price?.toLocaleString('vi-VN')}đ
Link affiliate: ${product.affiliateLink || '#'}
Mô tả: ${product.description || 'Sản phẩm chất lượng cao'}

Trả về JSON.`;

    const link = product.affiliateLink || '#';
    try {
      const result = await this.aiService.parseJson<GeneratedContent>(prompt, systemPrompt);
      // Replace any hallucinated API/wrong URLs with actual affiliateLink
      if (link !== '#') {
        result.content = result.content.replace(
          /https:\/\/tiki\.vn\/(?:api\/v2\/products\/\d+|product\/p\d+)[^\s]*/g,
          link,
        );
      }
      return result;
    } catch {
      return {
        title: `${product.name} - Giá tốt hôm nay!`,
        content: `${product.name} - Sản phẩm hot, giá ${product.price?.toLocaleString('vi-VN')}đ. Mua ngay: ${link}`,
        hashtags: ['muasắm', 'giảmgiá', product.category?.replace(/\s/g, '') || 'deal'].filter(Boolean),
      };
    }
  }

  async publishContent(id: string): Promise<void> {
    const content = await this.contentRepo.findOne({ where: { id } });
    if (!content) return;

    try {
      await this.publishToPlatform(content);
      await this.contentRepo.update(id, {
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      });
    } catch (e) {
      await this.contentRepo.update(id, { status: ContentStatus.FAILED });
      throw e;
    }
  }

  private async publishToPlatform(content: Content): Promise<void> {
    switch (content.platform) {
      case ContentPlatform.TELEGRAM:
        await this.publishToTelegram(content);
        break;
      case ContentPlatform.FACEBOOK:
        await this.publishToFacebook(content);
        break;
      default:
        this.logger.log(`Platform ${content.platform}: chưa tích hợp publisher, đánh dấu published`);
    }
  }

  private async publishToTelegram(content: Content): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHANNEL_ID;
    if (!token || !chatId) return;

    const text = `*${content.title}*\n\n${content.body}\n\n${content.hashtags.map((h) => `#${h}`).join(' ')}`;
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    });
  }

  private async publishToFacebook(content: Content): Promise<void> {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const token = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!pageId || !token) return;

    const message = `${content.title}\n\n${content.body}\n\n${content.hashtags.map((h) => `#${h}`).join(' ')}`;
    await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      message,
      access_token: token,
    });
  }

  async getPendingContents(limit = 30, platform?: ContentPlatform): Promise<Content[]> {
    const where: any = { status: ContentStatus.DRAFT };
    if (platform) where.platform = platform;
    return this.contentRepo.find({ where, order: { createdAt: 'DESC' }, take: limit });
  }

  async publishAllDraftTelegram(): Promise<{ published: number; failed: number }> {
    const drafts = await this.getPendingContents(50, ContentPlatform.TELEGRAM);
    let published = 0, failed = 0;
    for (const c of drafts) {
      try {
        await this.publishContent(c.id);
        published++;
      } catch { failed++; }
      await new Promise(r => setTimeout(r, 1500));
    }
    return { published, failed };
  }
}
