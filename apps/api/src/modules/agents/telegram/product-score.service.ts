import { Injectable } from '@nestjs/common';
import { BrandProduct } from './priority-brands.service';

export interface ScoredProduct extends BrandProduct {
  score: number;
}

const HIGH_DEMAND_CATS = ['Làm đẹp', 'Sức khỏe', 'Mẹ & Bé', 'Điện thoại', 'Flash Sale', 'Thực phẩm', 'Shopee'];

@Injectable()
export class ProductScoreService {
  private readonly MIN_SCORE = 35;

  score(product: BrandProduct): ScoredProduct {
    let s = 0;

    // Discount — 40pts
    const disc = product.discount || 0;
    if (disc >= 50) s += 40;
    else if (disc >= 40) s += 34;
    else if (disc >= 30) s += 28;
    else if (disc >= 20) s += 20;
    else if (disc >= 10) s += 10;

    // Price impulse-buy sweet spot — 25pts
    const p = product.price;
    if (p <= 500_000) s += 25;
    else if (p <= 1_000_000) s += 20;
    else if (p <= 2_000_000) s += 13;
    else if (p <= 5_000_000) s += 7;
    else s += 3;

    // Trend signal — 20pts
    if (product.brand === 'Tiki Flash Sale') {
      s += 20;
    } else {
      const name = product.name.toLowerCase();
      const trendHits = ['flash', 'sale', 'hot', 'mới', '2025', 'trending', 'giảm sốc'].filter(kw => name.includes(kw)).length;
      s += Math.min(20, trendHits * 8);
    }

    // Category demand — 15pts
    const catMatch = HIGH_DEMAND_CATS.some(c => product.category.toLowerCase().includes(c.toLowerCase()));
    s += catMatch ? 15 : 8;

    return { ...product, score: s };
  }

  // Giữ top keepTopPercent% sản phẩm (mặc định 20%)
  filter(products: BrandProduct[], keepTopPercent = 0.2): ScoredProduct[] {
    const scored = products.map(p => this.score(p)).filter(p => p.score >= this.MIN_SCORE);
    scored.sort((a, b) => b.score - a.score);
    const keepCount = Math.max(1, Math.ceil(scored.length * keepTopPercent));
    return scored.slice(0, keepCount);
  }
}
