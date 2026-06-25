import { Injectable, Logger } from '@nestjs/common';
import { ProfitScoreService } from './profit-score.service';
import { ProductLifecycleService } from './product-lifecycle.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';

export interface AdaptedContent {
  productId: string;
  hook: string;
  caption: string;
  cta: string;
  fullText: string;
  reason: string;
  adaptedAt: Date;
}

// Hook pools phân theo performance tier
const HIGH_PROFIT_HOOKS = [
  '🔥 ĐANG HOT — MUA NGAY KẺO HẾT',
  '💥 TOP DEAL HÔM NAY',
  '⚡ FLASH SALE — GIÁ SỐC',
  '🏆 SẢN PHẨM BÁN CHẠY #1',
  '🎯 KHÔNG MUA LÀ TIẾC',
];

const MEDIUM_PROFIT_HOOKS = [
  '✨ ƯU ĐÃI HÔM NAY',
  '🛍️ KHUYẾN MÃI LỚN',
  '💰 TIẾT KIỆM NGAY',
  '🔖 GIÁ TỐT — CHẤT LƯỢNG CAO',
];

const TEST_HOOKS = [
  '📦 SẢN PHẨM MỚI',
  '🌟 ĐÁNG THỬ HÔM NAY',
  '💡 GỢI Ý MUA SẮM',
];

const HIGH_CTA = [
  '👉 **Đặt hàng ngay — còn hàng hạn chế!**',
  '⏰ **Ưu đãi chỉ hôm nay — mua ngay!**',
  '🛒 **Thêm vào giỏ ngay để được giá này!**',
];

const MEDIUM_CTA = [
  '👉 Xem chi tiết và đặt hàng tại đây',
  '🔗 Nhấn link để mua với giá ưu đãi',
  '📱 Đặt hàng online — giao tận nhà',
];

const LOW_CTA = [
  '🔗 Xem thêm thông tin',
  '📋 Chi tiết sản phẩm',
];

@Injectable()
export class AdaptiveContentService {
  private readonly logger = new Logger(AdaptiveContentService.name);
  private readonly contentCache = new Map<string, AdaptedContent>();
  private rotationCounters = new Map<string, number>();

  constructor(
    private readonly profitScore: ProfitScoreService,
    private readonly lifecycle: ProductLifecycleService,
    private readonly tracker: AffiliateTrackerService,
  ) {}

  // Tạo nội dung thích ứng dựa trên profit tier và lifecycle stage
  adapt(productId: string, affiliateLink: string): AdaptedContent {
    const product = this.tracker.getProduct(productId);
    const score = this.profitScore.compute(productId);
    const stage = this.lifecycle.getStage(productId) || 'NEW';

    const entry = this.lifecycle.getEntry(productId);
    const pf = product ? new Intl.NumberFormat('vi-VN').format(product ? (entry?.productName ? 0 : 0) : 0) + 'đ' : '';

    // Chọn hook pool theo tier
    const hookPool = score.tier === 'HIGH' ? HIGH_PROFIT_HOOKS
      : score.tier === 'MEDIUM' ? MEDIUM_PROFIT_HOOKS
      : TEST_HOOKS;

    // Rotate hook để không trùng lặp
    const rotIdx = (this.rotationCounters.get(productId) || 0) % hookPool.length;
    this.rotationCounters.set(productId, rotIdx + 1);
    const hook = hookPool[rotIdx];

    // Chọn CTA
    const ctaPool = score.tier === 'HIGH' ? HIGH_CTA
      : score.tier === 'MEDIUM' ? MEDIUM_CTA
      : LOW_CTA;
    const cta = ctaPool[rotIdx % ctaPool.length];

    // Build caption
    const discountLine = (entry?.discountPct || 0) >= 15
      ? `🔥 GIẢM ${entry?.discountPct}%\n`
      : '';

    const stageBadge = stage === 'WINNER' ? '🏆 ' : stage === 'LOSER' ? '' : '';

    const name = entry?.productName || product?.name || productId;
    const category = product?.category || '';

    const caption = [
      `${hook}`,
      `${discountLine}${stageBadge}${name.slice(0, 80)}`,
      ``,
      `🏷️ ${category}`,
    ].filter(Boolean).join('\n');

    const fullText = [
      caption,
      ``,
      cta,
      `🔗 ${affiliateLink}`,
      ``,
      `#deal #${category.replace(/\s+/g, '').replace(/[^a-zA-ZÀ-ɏḀ-ỿ]/g, '')} #muasam`,
    ].join('\n');

    const reason = `Tier=${score.tier} Stage=${stage} Score=${score.total} Hook=${hookPool.indexOf(hook) + 1}/${hookPool.length}`;

    const content: AdaptedContent = {
      productId,
      hook,
      caption,
      cta,
      fullText,
      reason,
      adaptedAt: new Date(),
    };

    this.contentCache.set(productId, content);
    this.logger.debug(`Adaptive content [${name.slice(0, 30)}]: ${reason}`);

    return content;
  }

  // Lấy cached content hoặc tạo mới
  getOrAdapt(productId: string, affiliateLink: string): AdaptedContent {
    const cached = this.contentCache.get(productId);
    // Cache 30 phút
    if (cached && Date.now() - cached.adaptedAt.getTime() < 30 * 60_000) {
      return cached;
    }
    return this.adapt(productId, affiliateLink);
  }

  // Xóa cache để force regenerate (khi stage thay đổi)
  invalidate(productId: string): void {
    this.contentCache.delete(productId);
    this.rotationCounters.delete(productId);
  }

  getStats(): { cached: number; rotations: Record<string, number> } {
    const rotations: Record<string, number> = {};
    for (const [id, cnt] of this.rotationCounters) rotations[id] = cnt;
    return { cached: this.contentCache.size, rotations };
  }
}
