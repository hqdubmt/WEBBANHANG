import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { BrandProduct } from './priority-brands.service';

export interface ContentVariant {
  hook: string;
  caption: string;
  cta: string;
  fullText: string;
  variantIndex: number;
}

type HookFormula = (p: BrandProduct, pf: string) => { hook: string; caption: string; cta: string };

const HOOK_FORMULAS: HookFormula[] = [
  (p, pf) => ({
    hook: `90% người đang mua ${p.category.toLowerCase()} sai cách này…`,
    caption: `${p.name.slice(0, 70)} — Được 10.000+ người tin dùng`,
    cta: `👉 Xem ngay trước khi hết hàng`,
  }),
  (p, pf) => ({
    hook: `⚡ FLASH DEAL: ${p.discount ? `GIẢM ${p.discount}%` : 'GIÁ SỐC'} — Chỉ hôm nay!`,
    caption: `${p.name.slice(0, 70)} — Chỉ còn ${pf}`,
    cta: `🛒 Click mua ngay trước khi hết giá này`,
  }),
  (p, pf) => ({
    hook: `Đây là lý do bạn nên mua ${p.category.toLowerCase()} ngay bây giờ`,
    caption: `${p.name.slice(0, 70)} — Giá tốt nhất hôm nay`,
    cta: `💥 Đặt hàng trước khi giá tăng: ${pf}`,
  }),
];

const CTA_VARIANTS = [
  '👉 Mua ngay — Còn hàng hôm nay',
  '⚡ Click xem trước khi hết giá này',
  '🛒 Đặt ngay để nhận deal tốt nhất',
];

@Injectable()
export class HookAgentService {
  private readonly logger = new Logger(HookAgentService.name);

  constructor(private readonly aiService: AiService) {}

  async generateVariants(product: BrandProduct, affiliateLink: string, count = 3): Promise<ContentVariant[]> {
    const pf = new Intl.NumberFormat('vi-VN').format(product.price) + 'đ';

    // Thử AI trước
    try {
      const aiVariants = await this.generateWithAI(product, pf, affiliateLink, count);
      if (aiVariants.length >= count) return aiVariants;
    } catch (e) {
      this.logger.debug(`AI hook generation thất bại, dùng template: ${e.message}`);
    }

    // Fallback: template cứng
    return HOOK_FORMULAS.slice(0, count).map((formula, i) => {
      const { hook, caption, cta } = formula(product, pf);
      const discLine = (product.discount || 0) >= 20 ? `🔥 GIẢM ${product.discount}%\n` : '';
      const tag = product.category.replace(/\s/g, '').replace(/[&\-\/]/g, '');
      const fullText = [
        hook,
        '',
        discLine + caption,
        '',
        `💰 ${pf}`,
        '',
        `${CTA_VARIANTS[i % CTA_VARIANTS.length]}`,
        `🔗 ${affiliateLink}`,
        '',
        `#deal #${tag} #muasam #khuyenmai`,
      ].join('\n');
      return { hook, caption, cta, fullText, variantIndex: i };
    });
  }

  private async generateWithAI(
    product: BrandProduct,
    pf: string,
    link: string,
    count: number,
  ): Promise<ContentVariant[]> {
    const discInfo = (product.discount || 0) >= 20 ? `Giảm ${product.discount}%` : 'Giá cạnh tranh';
    const prompt = `Tạo ${count} variant nội dung bán hàng affiliate cho sản phẩm theo công thức HOOK + VẤN ĐỀ + GIẢI PHÁP + GIÁ + CTA:

Sản phẩm: ${product.name}
Giá: ${pf}
Khuyến mãi: ${discInfo}
Danh mục: ${product.category}

Yêu cầu:
- Mỗi variant có hook KHÁC NHAU (gây tò mò / urgency / FOMO / con số)
- Ngắn gọn, dùng cho Telegram/Facebook, có emoji
- CTA rõ ràng, thúc đẩy click ngay
- KHÔNG dùng link trong JSON, link sẽ được thêm sau

Trả về JSON array thuần (không markdown, không giải thích):
[{"hook":"...","caption":"...","cta":"..."}]`;

    const response = await this.aiService.generate(prompt);

    const match = response.match(/\[[\s\S]*?\]/);
    if (!match) return [];

    let parsed: Array<{ hook: string; caption: string; cta: string }>;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }

    const tag = product.category.replace(/\s/g, '').replace(/[&\-\/]/g, '');
    const discLine = (product.discount || 0) >= 20 ? `🔥 GIẢM ${product.discount}%\n` : '';

    return parsed.slice(0, count).map((v, i) => {
      const fullText = [
        v.hook,
        '',
        discLine + v.caption,
        '',
        `💰 ${pf}`,
        '',
        v.cta,
        `🔗 ${link}`,
        '',
        `#deal #${tag} #muasam`,
      ].join('\n');
      return { hook: v.hook, caption: v.caption, cta: v.cta, fullText, variantIndex: i };
    });
  }
}
