import { Injectable, Logger } from '@nestjs/common';
import { AffiliateTrackerService } from './affiliate-tracker.service';

export interface PostRecord {
  trackerId: string;
  productName: string;
  category: string;
  trackerUrl: string;
  hookUsed: string;
  platforms: string[];
  postedAt: Date;
  recycledCount: number;
}

export interface RecycleCandidate extends PostRecord {
  currentClicks: number;
  ageHours: number;
}

@Injectable()
export class RecycleService {
  private readonly logger = new Logger(RecycleService.name);
  private readonly history: PostRecord[] = [];

  constructor(private readonly tracker: AffiliateTrackerService) {}

  // Ghi lại post vừa đăng (gọi sau khi đăng thành công)
  recordPost(record: Omit<PostRecord, 'recycledCount'>): void {
    // Tránh duplicate
    const exists = this.history.find(h => h.trackerId === record.trackerId);
    if (exists) return;
    this.history.push({ ...record, recycledCount: 0 });
  }

  // Tìm bài đăng 3-7 ngày trước có click cao nhất để tái đăng
  getCandidates(minDaysAgo = 3, maxDaysAgo = 7, limit = 5): RecycleCandidate[] {
    const now = Date.now();
    const minMs = minDaysAgo * 24 * 60 * 60 * 1000;
    const maxMs = maxDaysAgo * 24 * 60 * 60 * 1000;

    return this.history
      .filter(record => {
        const age = now - record.postedAt.getTime();
        return age >= minMs && age <= maxMs;
      })
      .map(record => {
        const ageMs = now - record.postedAt.getTime();
        const tracked = this.tracker.getProduct(record.trackerId);
        return {
          ...record,
          currentClicks: tracked?.clicks || 0,
          ageHours: Math.round(ageMs / (60 * 60 * 1000)),
        };
      })
      .sort((a, b) => b.currentClicks - a.currentClicks)
      .slice(0, limit);
  }

  // Đánh dấu đã recycle
  markRecycled(trackerId: string): void {
    const record = this.history.find(h => h.trackerId === trackerId);
    if (record) {
      record.recycledCount++;
      this.logger.log(`Recycled: ${record.productName.slice(0, 40)} (lần ${record.recycledCount})`);
    }
  }

  getStats(): { total: number; totalRecycled: number; topPerformers: RecycleCandidate[] } {
    const now = Date.now();
    const all: RecycleCandidate[] = this.history.map(record => ({
      ...record,
      currentClicks: this.tracker.getProduct(record.trackerId)?.clicks || 0,
      ageHours: Math.round((now - record.postedAt.getTime()) / (60 * 60 * 1000)),
    }));

    all.sort((a, b) => b.currentClicks - a.currentClicks);

    return {
      total: all.length,
      totalRecycled: all.reduce((sum, r) => sum + r.recycledCount, 0),
      topPerformers: all.slice(0, 10),
    };
  }
}
