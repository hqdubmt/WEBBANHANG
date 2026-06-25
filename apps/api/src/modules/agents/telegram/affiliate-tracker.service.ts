import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

export interface TrackedProduct {
  id: string;
  name: string;
  category: string;
  affiliateLink: string;
  originalUrl: string;
  clicks: number;
  clicksBySource: Record<string, number>;
  registeredAt: Date;
  lastClickAt?: Date;
}

export interface TrackerStats {
  totalProducts: number;
  totalClicks: number;
  topProducts: TrackedProduct[];
  ctrBySource: Record<string, number>;
}

@Injectable()
export class AffiliateTrackerService {
  private readonly logger = new Logger(AffiliateTrackerService.name);
  private readonly products = new Map<string, TrackedProduct>();

  generateId(url: string): string {
    return createHash('md5').update(url).digest('hex').slice(0, 8);
  }

  // Đăng ký sản phẩm → trả về tracker ID
  register(name: string, category: string, originalUrl: string, affiliateLink: string): string {
    const id = this.generateId(originalUrl);
    if (!this.products.has(id)) {
      this.products.set(id, {
        id,
        name,
        category,
        affiliateLink,
        originalUrl,
        clicks: 0,
        clicksBySource: {},
        registeredAt: new Date(),
      });
    }
    return id;
  }

  // Ghi nhận click → trả về affiliate link để redirect
  trackClick(productId: string, source: string): string | null {
    const product = this.products.get(productId);
    if (!product) return null;

    product.clicks++;
    product.clicksBySource[source] = (product.clicksBySource[source] || 0) + 1;
    product.lastClickAt = new Date();

    this.logger.log(`Click: [${source}] ${product.name.slice(0, 40)} → tổng ${product.clicks} clicks`);
    return product.affiliateLink;
  }

  getProduct(id: string): TrackedProduct | undefined {
    return this.products.get(id);
  }

  getStats(): TrackerStats {
    const all = Array.from(this.products.values());
    const totalClicks = all.reduce((sum, p) => sum + p.clicks, 0);
    const topProducts = [...all].sort((a, b) => b.clicks - a.clicks).slice(0, 10);

    const ctrBySource: Record<string, number> = {};
    for (const p of all) {
      for (const [src, cnt] of Object.entries(p.clicksBySource)) {
        ctrBySource[src] = (ctrBySource[src] || 0) + cnt;
      }
    }

    return { totalProducts: all.length, totalClicks, topProducts, ctrBySource };
  }

  getAllProducts(): TrackedProduct[] {
    return Array.from(this.products.values());
  }

  getTopConverters(limit = 5): TrackedProduct[] {
    return Array.from(this.products.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  }

  // Tạo tracker URL — dùng thay cho direct affiliate link trong post
  buildTrackerUrl(productId: string, source: string): string {
    const base = process.env.API_BASE_URL || 'http://localhost:3000';
    return `${base}/agents/telegram/go/${productId}?src=${source}`;
  }
}
