import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';

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

  private readonly redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6380,
    password: process.env.REDIS_PASSWORD || undefined,
    // enableOfflineQueue mặc định true — queue lệnh khi đang connect thay vì throw
    lazyConnect: false,
  });

  // Redis key schema:
  //   affiliate:rev:{YYYY-MM-DD}   → HASH brand → epc_sum (VND)
  //   affiliate:rev:alltime        → HASH brand → epc_sum (VND)
  //   affiliate:posts:total        → HASH brand → post_count
  private revKey(date: string) { return `affiliate:rev:${date}`; }
  private readonly REV_TTL = 90 * 24 * 3600; // 90 ngày

  generateId(url: string): string {
    return createHash('md5').update(url).digest('hex').slice(0, 8);
  }

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

  trackClick(productId: string, source: string): string | null {
    const product = this.products.get(productId);
    if (!product) return null;

    product.clicks++;
    product.clicksBySource[source] = (product.clicksBySource[source] || 0) + 1;
    product.lastClickAt = new Date();

    this.logger.log(`Click: [${source}] ${product.name.slice(0, 40)} → tổng ${product.clicks} clicks`);
    return product.affiliateLink;
  }

  // YYYY-MM-DD theo giờ Việt Nam (UTC+7) — toISOString() luôn là UTC nên phải offset thủ công
  private vnDateStr(): string {
    return new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0];
  }

  // Ghi nhận EPC ước tính sau mỗi lần đăng sản phẩm thành công
  async recordRevenue(brand: string, epcVnd: number): Promise<void> {
    if (epcVnd <= 0) return;
    const today = this.vnDateStr();
    try {
      await Promise.all([
        this.redis.hincrbyfloat(this.revKey(today), brand, epcVnd),
        this.redis.hincrbyfloat('affiliate:rev:alltime', brand, epcVnd),
        this.redis.hincrby('affiliate:posts:total', brand, 1),
      ]);
      // TTL ngày — chỉ set lần đầu (NX flag không có trong hincrbyfloat, nên expire thôi)
      await this.redis.expire(this.revKey(today), this.REV_TTL);
    } catch (e: any) {
      this.logger.warn(`recordRevenue Redis lỗi: ${e.message}`);
    }
  }

  // Tổng EPC ước tính theo ngày, phân theo brand
  async getDailyRevenueSummary(date?: string): Promise<Record<string, number>> {
    const d = date ?? this.vnDateStr();
    try {
      const raw = await this.redis.hgetall(this.revKey(d));
      return Object.fromEntries(
        Object.entries(raw ?? {}).map(([k, v]) => [k, Math.round(Number(v))])
      );
    } catch {
      return {};
    }
  }

  // Top brands all-time theo EPC tích lũy
  async getAllTimeTopBrands(limit = 5): Promise<Array<{ brand: string; revenue: number; posts: number }>> {
    try {
      const [revRaw, postsRaw] = await Promise.all([
        this.redis.hgetall('affiliate:rev:alltime'),
        this.redis.hgetall('affiliate:posts:total'),
      ]);
      return Object.entries(revRaw ?? {})
        .map(([brand, rev]) => ({
          brand,
          revenue: Math.round(Number(rev)),
          posts: Number(postsRaw?.[brand] ?? 0),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    } catch {
      return [];
    }
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

  // Chỉ trả về redirect URL nếu API_BASE_URL là domain thật (không phải IP hay localhost).
  // Khi server chưa có domain public, caller dùng direct AT link thay thế.
  buildTrackerUrl(productId: string, source: string): string | null {
    const base = process.env.API_BASE_URL || '';
    const isPublic = base.startsWith('https://') ||
      (base.startsWith('http://') && !/http:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|14\.|)/.test(base) && !base.includes('localhost'));
    // Kiểm tra đơn giản hơn: phải có domain chữ (không phải IP thuần)
    const hasPublicDomain = /https?:\/\/[a-zA-Z].*\.[a-zA-Z]/.test(base);
    if (!hasPublicDomain) return null;
    return `${base}/agents/telegram/go/${productId}?src=${source}`;
  }
}
