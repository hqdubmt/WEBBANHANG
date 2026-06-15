import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { ProductsService } from '../products/products.service';
import { Content, ContentPlatform, ContentStatus } from '../../database/entities/content.entity';

export interface LandingPageResult {
  contentId: string;
  slug: string;
  html: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  type: 'product' | 'campaign';
}

@Injectable()
export class LandingPageService {
  private readonly logger = new Logger(LandingPageService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
  ) {}

  // ─── F03: Product Page ────────────────────────────────────────────────────

  async generateProductPage(productId: string): Promise<LandingPageResult> {
    const product = await this.productsService.findOne(productId);

    const prompt = `Tạo landing page HTML cho sản phẩm:
Tên: ${product.name}
Giá: ${product.price?.toLocaleString('vi-VN')}đ
Mô tả: ${product.description || 'Sản phẩm chất lượng cao'}
Ảnh: ${product.image || ''}

Trả về JSON:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "keywords": ["kw1","kw2"],
  "slug": "ten-san-pham-slug",
  "html": "<section>...full HTML body content (không bao gồm <html>/<head>)...</section>"
}

HTML phải có: hero section, features, giá, CTA button, testimonial giả, FAQ. SEO-friendly. Tiếng Việt.`;

    const result = await this.aiService.parseJson<{
      metaTitle: string;
      metaDescription: string;
      keywords: string[];
      slug: string;
      html: string;
    }>(prompt, 'Bạn là web copywriter & SEO specialist Việt Nam. Chỉ trả về JSON hợp lệ.');

    const content = await this.contentRepo.save(
      this.contentRepo.create({
        productId,
        title: result.metaTitle,
        body: result.html,
        hashtags: result.keywords,
        platform: ContentPlatform.WEBSITE,
        status: ContentStatus.DRAFT,
      }),
    );

    this.logger.log(`Landing page created for product ${product.name}: /${result.slug}`);

    return {
      contentId: content.id,
      slug: result.slug,
      html: result.html,
      metaTitle: result.metaTitle,
      metaDescription: result.metaDescription,
      keywords: result.keywords,
      type: 'product',
    };
  }

  // ─── F03: Campaign Page ───────────────────────────────────────────────────

  async generateCampaignPage(dto: {
    campaignName: string;
    goal: string;
    productIds?: string[];
    discount?: string;
    endDate?: string;
  }): Promise<LandingPageResult> {
    let productContext = '';
    if (dto.productIds?.length) {
      const products = await Promise.all(
        dto.productIds.slice(0, 5).map((id) => this.productsService.findOne(id).catch(() => null)),
      );
      const valid = products.filter(Boolean);
      productContext = valid.map((p) => `- ${p.name}: ${p.price?.toLocaleString('vi-VN')}đ`).join('\n');
    }

    const prompt = `Tạo landing page HTML cho chiến dịch marketing:
Tên chiến dịch: ${dto.campaignName}
Mục tiêu: ${dto.goal}
Ưu đãi: ${dto.discount || 'Giảm giá đặc biệt'}
Kết thúc: ${dto.endDate || 'Có hạn'}
Sản phẩm:
${productContext || '(nhiều sản phẩm)'}

Trả về JSON:
{
  "metaTitle": "...",
  "metaDescription": "...",
  "keywords": ["kw1","kw2"],
  "slug": "campaign-slug",
  "html": "<section>...nội dung landing page với countdown timer stub, product grid, urgency...</section>"
}

HTML cần: hero section với tiêu đề mạnh, countdown urgency, danh sách sản phẩm/ưu đãi, social proof, CTA rõ. Tiếng Việt.`;

    const result = await this.aiService.parseJson<{
      metaTitle: string;
      metaDescription: string;
      keywords: string[];
      slug: string;
      html: string;
    }>(prompt, 'Bạn là conversion rate optimization specialist Việt Nam. Chỉ trả về JSON hợp lệ.');

    // Campaign pages are not tied to a single product — use first productId if available
    const content = await this.contentRepo.save(
      this.contentRepo.create({
        productId: dto.productIds?.[0] || 'campaign',
        title: result.metaTitle,
        body: result.html,
        hashtags: result.keywords,
        platform: ContentPlatform.WEBSITE,
        status: ContentStatus.DRAFT,
      }),
    );

    this.logger.log(`Campaign landing page created: /${result.slug}`);

    return {
      contentId: content.id,
      slug: result.slug,
      html: result.html,
      metaTitle: result.metaTitle,
      metaDescription: result.metaDescription,
      keywords: result.keywords,
      type: 'campaign',
    };
  }

  // ─── Retrieve stored pages ────────────────────────────────────────────────

  async listLandingPages(): Promise<Content[]> {
    return this.contentRepo.find({
      where: { platform: ContentPlatform.WEBSITE },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
