import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';
import { SeoArticle, ArticleStatus } from '../../../database/entities/seo-article.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';

interface SeoOutput {
  keyword: string;
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  clusterKeywords: string[];
  internalLinks: string[];
}

@Injectable()
export class SeoAgentService {
  private readonly logger = new Logger(SeoAgentService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(SeoArticle)
    private readonly articleRepo: Repository<SeoArticle>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 7 * * *')
  async runDailySeoGeneration() {
    this.logger.log('SEO Agent: bắt đầu tạo bài SEO...');
    await this.generateDailyArticles();
  }

  async generateDailyArticles(count = 5): Promise<SeoArticle[]> {
    const log = this.logRepo.create({ agent: AgentName.SEO, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const products = await this.productsService.getHotProducts(count);
      const articles: SeoArticle[] = [];

      for (const product of products) {
        const seo = await this.generateArticle(product);
        const article = this.articleRepo.create({
          keyword: seo.keyword,
          title: seo.title,
          slug: seo.slug,
          content: seo.content,
          metaDescription: seo.metaDescription,
          clusterKeywords: seo.clusterKeywords,
          internalLinks: seo.internalLinks,
          productId: product.id,
          wordCount: seo.content.split(/\s+/).length,
          status: ArticleStatus.DRAFT,
        });
        articles.push(await this.articleRepo.save(article));
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { created: articles.length } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`SEO Agent: tạo ${articles.length} bài viết`);
      return articles;
    } catch (e) {
      this.logger.error('SEO Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  private async generateArticle(product: any): Promise<SeoOutput> {
    const systemPrompt = `Bạn là chuyên gia SEO content cho TMĐT Việt Nam.
Tạo bài viết SEO đầy đủ, tự nhiên, không spam từ khóa.
Trả về JSON: {
  "keyword": "từ khóa chính",
  "title": "tiêu đề hấp dẫn",
  "slug": "slug-url-than-thien",
  "content": "nội dung bài viết 600-900 từ, có heading H2/H3",
  "metaDescription": "mô tả 155 ký tự",
  "clusterKeywords": ["kw1", "kw2", "kw3"],
  "internalLinks": ["/san-pham/...", "/danh-muc/..."]
}`;

    const prompt = `Sản phẩm: ${product.name}
Danh mục: ${product.category || 'Chung'}
Giá: ${product.price?.toLocaleString('vi-VN')}đ
Mô tả: ${product.description || ''}

Tạo bài SEO JSON:`;

    try {
      return await this.aiService.parseJson<SeoOutput>(prompt, systemPrompt);
    } catch {
      const keyword = product.name.toLowerCase().replace(/\s+/g, '-');
      return {
        keyword: product.name,
        title: `${product.name} - Đánh giá & Mua giá tốt`,
        slug: keyword,
        content: `# ${product.name}\n\n${product.description || product.name} là sản phẩm chất lượng cao với giá ${product.price?.toLocaleString('vi-VN')}đ.\n\n## Đặc điểm nổi bật\n\nSản phẩm thuộc danh mục ${product.category || 'phổ biến'}, được nhiều khách hàng tin dùng.\n\n## Giá & Mua hàng\n\nMua ngay với giá ưu đãi: ${product.affiliateLink || '#'}`,
        metaDescription: `Mua ${product.name} giá ${product.price?.toLocaleString('vi-VN')}đ. Chất lượng đảm bảo, giao hàng nhanh.`,
        clusterKeywords: [product.name, product.category || ''],
        internalLinks: [],
      };
    }
  }

  async getDraftArticles(limit = 20): Promise<SeoArticle[]> {
    return this.articleRepo.find({
      where: { status: ArticleStatus.DRAFT },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
