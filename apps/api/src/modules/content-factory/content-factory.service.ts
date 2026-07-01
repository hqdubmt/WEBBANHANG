import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { ProductsService } from '../products/products.service';
import { Content, ContentPlatform, ContentStatus } from '../../database/entities/content.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../database/entities/agent-log.entity';

interface ContentPlan {
  platform: ContentPlatform;
  count: number;
  topic: string;
}

@Injectable()
export class ContentFactoryService {
  private readonly logger = new Logger(ContentFactoryService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  // Tắt: TelegramAgentService đã scrape live AT campaigns và đăng trực tiếp, không cần pipeline DB này
  // @Cron('0 * * * *')
  // async runContentPipeline() { ... }

  async executePipeline(plan?: ContentPlan[]): Promise<Content[]> {
    const log = this.logRepo.create({ agent: AgentName.CONTENT, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    const defaultPlan: ContentPlan[] = plan || [
      { platform: ContentPlatform.FACEBOOK, count: 3, topic: 'deal hot' },
      { platform: ContentPlatform.TELEGRAM, count: 3, topic: 'flash sale' },
      { platform: ContentPlatform.TIKTOK, count: 2, topic: 'viral product' },
      { platform: ContentPlatform.WEBSITE, count: 2, topic: 'seo blog' },
    ];

    try {
      const allProducts = await this.productsService.getHotProducts(30);
      // Bỏ sản phẩm Tiki: ti.ki NXDOMAIN → deeplink v5 Tiki chết toàn bộ
      const products = allProducts.filter(p => {
        const link = p.affiliateLink || '';
        return !link.includes('tiki.vn') && !link.includes('tiki%2');
      });
      const created: Content[] = [];

      for (const planItem of defaultPlan) {
        const topProducts = products.slice(0, planItem.count);
        for (const product of topProducts) {
          const generated = await this.generateContent(product, planItem);
          const content = this.contentRepo.create({
            productId: product.id,
            title: generated.title,
            body: generated.content,
            hashtags: generated.hashtags,
            platform: planItem.platform,
            imageUrl: product.image,
            status: ContentStatus.DRAFT,
          });
          created.push(await this.contentRepo.save(content));
        }
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { created: created.length, platforms: defaultPlan.map((p) => p.platform) } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Content Factory: tạo ${created.length} nội dung`);
      return created;
    } catch (e) {
      this.logger.error('Content Factory lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  private async generateContent(
    product: any,
    plan: ContentPlan,
  ): Promise<{ title: string; content: string; hashtags: string[] }> {
    const platformGuide: Record<ContentPlatform, string> = {
      [ContentPlatform.FACEBOOK]: 'bài Facebook thân thiện, emoji, 300-500 ký tự, CTA rõ ràng',
      [ContentPlatform.TELEGRAM]: 'tin Telegram ngắn gọn, bold markdown, 150-250 ký tự',
      [ContentPlatform.WEBSITE]: 'bài blog SEO 600-800 từ, có heading, keyword tự nhiên',
      [ContentPlatform.TIKTOK]: 'kịch bản TikTok 60s, hook mạnh 3s đầu, storytelling',
    };

    const systemPrompt = `Bạn là content creator đa nền tảng Việt Nam, chuyên bán hàng online.
Topic: ${plan.topic}. Tạo ${platformGuide[plan.platform]}.
Trả về JSON: {"title":"...","content":"...","hashtags":[]}`;

    try {
      return await this.aiService.parseJson(
        `Sản phẩm: ${product.name}, giá: ${product.price?.toLocaleString('vi-VN')}đ, link: ${product.affiliateLink || '#'}`,
        systemPrompt,
      );
    } catch {
      return {
        title: `${product.name} - ${plan.topic}`,
        content: `${product.name} - Sản phẩm hot, giá ${product.price?.toLocaleString('vi-VN')}đ. Mua ngay: ${product.affiliateLink || '#'}`,
        hashtags: ['deal', 'muasắm', plan.platform],
      };
    }
  }

  async getContentStats(): Promise<Record<string, number>> {
    const contents = await this.contentRepo.find();
    return contents.reduce<Record<string, number>>((acc, c) => {
      acc[c.platform] = (acc[c.platform] || 0) + 1;
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
  }
}
