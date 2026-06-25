import { Injectable, Logger } from '@nestjs/common';
import { HookAgentService, ContentVariant } from './hook-agent.service';
import { BrandProduct } from './priority-brands.service';

export interface VariantStat {
  variantIndex: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface ProductVariantState {
  productId: string;
  variants: ContentVariant[];
  stats: VariantStat[];
  bestVariantIndex: number;
}

@Injectable()
export class ContentVariantService {
  private readonly logger = new Logger(ContentVariantService.name);
  private readonly states = new Map<string, ProductVariantState>();

  constructor(private readonly hookAgent: HookAgentService) {}

  // Tạo 3 variants cho sản phẩm (cache lại nếu đã có)
  async createVariants(productId: string, product: BrandProduct, affiliateLink: string): Promise<ContentVariant[]> {
    const existing = this.states.get(productId);
    if (existing) return existing.variants;

    const variants = await this.hookAgent.generateVariants(product, affiliateLink, 3);
    const stats: VariantStat[] = variants.map((_, i) => ({
      variantIndex: i,
      impressions: 0,
      clicks: 0,
      ctr: 0,
    }));

    this.states.set(productId, { productId, variants, stats, bestVariantIndex: 0 });
    this.logger.log(`A/B variants tạo xong cho: ${product.name.slice(0, 40)}`);
    return variants;
  }

  recordImpression(productId: string, variantIndex: number): void {
    const state = this.states.get(productId);
    if (!state || !state.stats[variantIndex]) return;
    state.stats[variantIndex].impressions++;
    this.recalcCtr(state, variantIndex);
  }

  recordClick(productId: string, variantIndex: number): void {
    const state = this.states.get(productId);
    if (!state || !state.stats[variantIndex]) return;
    state.stats[variantIndex].clicks++;
    this.recalcCtr(state, variantIndex);
    // Cập nhật variant tốt nhất theo CTR
    state.bestVariantIndex = state.stats.reduce(
      (best, s) => s.ctr > state.stats[best].ctr ? s.variantIndex : best,
      0,
    );
    this.logger.log(`A/B update: product=${productId} best=variant${state.bestVariantIndex} CTR=${(state.stats[state.bestVariantIndex].ctr * 100).toFixed(1)}%`);
  }

  // Trả về variant có CTR cao nhất (hoặc variant 0 nếu chưa có data)
  getBestVariant(productId: string): ContentVariant | null {
    const state = this.states.get(productId);
    if (!state || state.variants.length === 0) return null;
    return state.variants[state.bestVariantIndex] ?? state.variants[0];
  }

  getStats(): Array<{ productId: string; bestVariantIndex: number; stats: VariantStat[] }> {
    return Array.from(this.states.values()).map(s => ({
      productId: s.productId,
      bestVariantIndex: s.bestVariantIndex,
      stats: s.stats,
    }));
  }

  // Xóa cache để force generate hook mới (dùng bởi REWRITE flow)
  clearVariants(productId: string): void {
    if (this.states.delete(productId)) {
      this.logger.log(`A/B cache cleared (rewrite): ${productId}`);
    }
  }

  private recalcCtr(state: ProductVariantState, idx: number): void {
    const s = state.stats[idx];
    s.ctr = s.impressions > 0 ? s.clicks / s.impressions : 0;
  }
}
