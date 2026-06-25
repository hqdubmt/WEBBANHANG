import { Injectable, Logger } from '@nestjs/common';
import { EventCollectorService } from './event-collector.service';

export interface RegulationStatus {
  productId: string;
  postsInWindow: number;
  isThrottled: boolean;
  qualityScore: number;
  throttledUntil?: Date;
}

// Anti-spam: tối đa N lần đăng mỗi sản phẩm trong X giờ
const MAX_POSTS_PER_PRODUCT_PER_HOUR = 2;
const MAX_POSTS_PER_PRODUCT_PER_DAY = 8;
const MIN_QUALITY_SCORE = 20; // sản phẩm có quality < 20 không được đăng

@Injectable()
export class SelfRegulationService {
  private readonly logger = new Logger(SelfRegulationService.name);

  // Lịch sử post: productId → timestamps
  private readonly postHistory = new Map<string, Date[]>();
  // Throttle until: productId → Date
  private readonly throttleMap = new Map<string, Date>();
  // Quality scores: productId → score (0-100)
  private readonly qualityScores = new Map<string, number>();

  constructor(private readonly events: EventCollectorService) {}

  // Kiểm tra xem có được phép đăng sản phẩm này không
  canPost(productId: string): { allowed: boolean; reason?: string } {
    // Throttle check
    const throttledUntil = this.throttleMap.get(productId);
    if (throttledUntil && throttledUntil > new Date()) {
      return { allowed: false, reason: `Throttled until ${throttledUntil.toLocaleTimeString('vi-VN')}` };
    }

    // Quality score check
    const qualScore = this.qualityScores.get(productId) ?? 100;
    if (qualScore < MIN_QUALITY_SCORE) {
      return { allowed: false, reason: `Quality score quá thấp (${qualScore}/100 < ${MIN_QUALITY_SCORE})` };
    }

    // Hourly rate limit
    const history = this.postHistory.get(productId) || [];
    const now = Date.now();
    const inLastHour = history.filter(t => now - t.getTime() < 3_600_000).length;
    if (inLastHour >= MAX_POSTS_PER_PRODUCT_PER_HOUR) {
      return { allowed: false, reason: `Rate limit: ${inLastHour}/${MAX_POSTS_PER_PRODUCT_PER_HOUR} posts trong 1 giờ` };
    }

    // Daily rate limit
    const inLastDay = history.filter(t => now - t.getTime() < 86_400_000).length;
    if (inLastDay >= MAX_POSTS_PER_PRODUCT_PER_DAY) {
      return { allowed: false, reason: `Rate limit: ${inLastDay}/${MAX_POSTS_PER_PRODUCT_PER_DAY} posts trong 24 giờ` };
    }

    return { allowed: true };
  }

  // Ghi nhận đã đăng sản phẩm này
  recordPost(productId: string): void {
    const history = this.postHistory.get(productId) || [];
    history.push(new Date());

    // Giữ max 50 entries gần nhất
    if (history.length > 50) history.splice(0, history.length - 50);
    this.postHistory.set(productId, history);

    // Auto throttle nếu đăng quá nhiều
    const inLastHour = history.filter(t => Date.now() - t.getTime() < 3_600_000).length;
    if (inLastHour >= MAX_POSTS_PER_PRODUCT_PER_HOUR) {
      const throttleUntil = new Date(Date.now() + 60 * 60_000); // 1 giờ
      this.throttleMap.set(productId, throttleUntil);
      this.logger.warn(`Self-regulate THROTTLE [${productId}] until ${throttleUntil.toLocaleTimeString('vi-VN')}`);
    }
  }

  // Cập nhật quality score (gọi từ lifecycle/profit engine)
  setQualityScore(productId: string, score: number): void {
    this.qualityScores.set(productId, Math.max(0, Math.min(100, score)));
  }

  // Tính quality score tự động từ event data
  computeQuality(productId: string): number {
    const clicks = this.events.getClickCounts(86_400_000)[productId] || 0;
    const views = this.events.getViewCounts(86_400_000)[productId] || 0;
    const posts = (this.postHistory.get(productId) || [])
      .filter(t => Date.now() - t.getTime() < 86_400_000).length;

    if (posts === 0) return 100; // Chưa đăng → không bị phạt
    if (views === 0 && posts > 3) return 10; // Đăng nhiều không ai xem → chất lượng thấp

    const ctr = views > 0 ? clicks / views : 0;
    const ctrScore = Math.min(60, ctr * 600); // 10% CTR = 60pts
    const engageScore = Math.min(40, (clicks / Math.max(1, posts)) * 20); // 2 clicks/post = 40pts

    const quality = Math.round(ctrScore + engageScore);
    this.setQualityScore(productId, quality);
    return quality;
  }

  getStatus(productId: string): RegulationStatus {
    const history = this.postHistory.get(productId) || [];
    const now = Date.now();
    const postsInWindow = history.filter(t => now - t.getTime() < 86_400_000).length;
    const throttledUntil = this.throttleMap.get(productId);
    const isThrottled = !!throttledUntil && throttledUntil > new Date();

    return {
      productId,
      postsInWindow,
      isThrottled,
      qualityScore: this.qualityScores.get(productId) ?? 100,
      throttledUntil: isThrottled ? throttledUntil : undefined,
    };
  }

  // Tổng hợp stats
  getStats(): { totalTracked: number; throttled: number; lowQuality: number } {
    const now = new Date();
    const throttled = Array.from(this.throttleMap.values()).filter(t => t > now).length;
    const lowQuality = Array.from(this.qualityScores.values()).filter(s => s < MIN_QUALITY_SCORE).length;
    return { totalTracked: this.postHistory.size, throttled, lowQuality };
  }
}
