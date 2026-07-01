import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import Redis from 'ioredis';

export interface PostProduct {
  name: string;
  link: string;        // tracker URL (dùng trong feed text nếu public domain)
  affiliateLink: string; // direct AT link — dùng trong auto-reply comment (luôn work)
  category: string;
  trackerId?: string;
}

export interface EngagementStats {
  postId: string;
  likes: number;
  comments: number;
  shares: number;
  polledAt: number;
}

// Từ khóa người mua hay comment để hỏi link/giá
const BUY_KEYWORDS = [
  'link', 'mua', 'ở đâu', 'o dau', 'giá', 'gia',
  'order', 'đặt', 'dat', 'bao nhiêu', 'bao nhieu',
  'còn hàng', 'con hang', 'ship', 'inbox', ' ib ',
  'muốn', 'muon', 'quan tâm', 'quan tam',
  'cho mình', 'cho minh', 'xin link', 'có link',
];

@Injectable()
export class FanpageReceptionService {
  private readonly logger = new Logger(FanpageReceptionService.name);

  private readonly redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6380,
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: false,
  });

  // ─── Lưu mapping postId → sản phẩm để auto-reply comment ───────────────────

  async storePostProduct(fbPostId: string, data: PostProduct): Promise<void> {
    try {
      await this.redis.set(`fb:post:${fbPostId}`, JSON.stringify(data), 'EX', 72 * 3600);
      // Đăng ký để poll engagement sau 35 phút
      const pollAt = Date.now() + 35 * 60 * 1000;
      await this.redis.zadd('fb:poll:queue', pollAt, fbPostId);
      this.logger.log(`FB post registered: ${fbPostId.slice(-8)} → ${data.name.slice(0, 30)}`);
    } catch (e: any) {
      this.logger.warn(`storePostProduct Redis lỗi: ${e.message}`);
    }
  }

  // ─── Facebook Webhook verify (GET) ──────────────────────────────────────────

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const expected = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'dealbot_verify_2026';
    if (mode === 'subscribe' && token === expected) return challenge;
    return null;
  }

  // ─── Facebook Webhook event handler (POST) ──────────────────────────────────

  async handleWebhookEvent(body: any): Promise<void> {
    if (body?.object !== 'page') return;
    for (const entry of (body.entry ?? [])) {
      for (const change of (entry.changes ?? [])) {
        if (change.field !== 'feed') continue;
        const v = change.value;
        if (v?.item === 'comment' && v?.verb === 'add') {
          await this.handleComment(v).catch(e =>
            this.logger.warn(`handleComment lỗi: ${e.message}`)
          );
        }
      }
    }
  }

  private async handleComment(v: any): Promise<void> {
    const commentId: string = v.comment_id;
    const postId: string = v.post_id; // format: PAGEID_POSTID
    const message: string = (v.message || '').toLowerCase();
    const senderId: string = v.from?.id;
    const pageId = process.env.FACEBOOK_PAGE_ID;

    // Bỏ qua comment của chính page (tránh reply vòng lặp)
    if (senderId && senderId === pageId) return;
    // Bỏ qua nếu là reply (có parent_id khác post_id)
    if (v.parent_id && v.parent_id !== postId) return;

    if (!this.hasBuyIntent(message)) return;

    // Lấy thông tin sản phẩm của bài đó
    let raw: string | null = null;
    try { raw = await this.redis.get(`fb:post:${postId}`); } catch { return; }
    if (!raw) return;

    // Chống reply trùng cho cùng comment
    const replyKey = `fb:replied:${commentId}`;
    try {
      const already = await this.redis.exists(replyKey);
      if (already) return;
      await this.redis.set(replyKey, '1', 'EX', 7 * 24 * 3600);
    } catch { return; }

    const product: PostProduct = JSON.parse(raw);
    await this.replyComment(commentId, product);
  }

  private hasBuyIntent(msg: string): boolean {
    return BUY_KEYWORDS.some(k => msg.includes(k));
  }

  private async replyComment(commentId: string, product: PostProduct): Promise<void> {
    const pageToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!pageToken) return;

    const name = product.name.slice(0, 35);
    // Dùng affiliateLink trực tiếp (go.isclix.com) — tracker URL dạng IP không click được trên FB mobile
    const replyLink = product.affiliateLink || product.link;
    const reply =
      `🛒 Link mua ${name}${product.name.length > 35 ? '...' : ''} cho bạn nè:\n` +
      `👉 ${replyLink}\n` +
      `⚡ Deal này có giới hạn thời gian, đặt sớm kẻo hết nha!\n` +
      `📢 Follow trang để nhận deal mới mỗi ngày!`;

    try {
      await axios.post(
        `https://graph.facebook.com/v19.0/${commentId}/comments`,
        null,
        { params: { message: reply, access_token: pageToken }, timeout: 10000 },
      );
      this.logger.log(`Auto-reply OK → comment ${commentId.slice(-8)} | ${name}`);

      // Ghi lại số auto-reply theo ngày
      const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0];
      await this.redis.hincrby('fb:autoreplies', today, 1).catch(() => {});
    } catch (e: any) {
      this.logger.warn(`Auto-reply lỗi: ${e.response?.data?.error?.message || e.message}`);
    }
  }

  // ─── Engagement polling (cron mỗi 35 phút) ──────────────────────────────────

  async pollDueEngagements(): Promise<void> {
    const now = Date.now();
    let postIds: string[] = [];
    try {
      postIds = await this.redis.zrangebyscore('fb:poll:queue', 0, now);
      if (postIds.length === 0) return;
      await this.redis.zremrangebyscore('fb:poll:queue', 0, now);
    } catch { return; }

    this.logger.log(`Polling engagement cho ${postIds.length} bài`);
    for (const postId of postIds) {
      await this.pollSinglePost(postId).catch(() => {});
    }
  }

  private async pollSinglePost(postId: string): Promise<void> {
    const pageToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!pageToken) return;
    try {
      const res = await axios.get(`https://graph.facebook.com/v19.0/${postId}`, {
        params: {
          fields: 'reactions.summary(true),comments.summary(true),shares',
          access_token: pageToken,
        },
        timeout: 10000,
      });
      const likes = res.data.reactions?.summary?.total_count ?? 0;
      const comments = res.data.comments?.summary?.total_count ?? 0;
      const shares = res.data.shares?.count ?? 0;
      const score = likes + comments * 3 + shares * 5; // weighted engagement

      await this.redis.hset(`fb:eng:${postId}`, { likes, comments, shares, score, at: now() });
      await this.redis.expire(`fb:eng:${postId}`, 30 * 24 * 3600);

      // Lưu vào sorted set để lấy top posts
      await this.redis.zadd('fb:top:posts', score, postId);
      await this.redis.zremrangebyrank('fb:top:posts', 0, -51); // giữ top 50

      this.logger.log(`Engagement ${postId.slice(-8)}: 👍${likes} 💬${comments} 🔁${shares} score=${score}`);
    } catch (e: any) {
      this.logger.debug(`Poll ${postId.slice(-8)} lỗi: ${e.response?.data?.error?.message || e.message}`);
    }
  }

  // ─── Stats APIs ──────────────────────────────────────────────────────────────

  async getTopPosts(limit = 10): Promise<EngagementStats[]> {
    try {
      const postIds = await this.redis.zrevrange('fb:top:posts', 0, limit - 1);
      const results: EngagementStats[] = [];
      for (const postId of postIds) {
        const data = await this.redis.hgetall(`fb:eng:${postId}`);
        if (data) {
          results.push({
            postId,
            likes: Number(data.likes || 0),
            comments: Number(data.comments || 0),
            shares: Number(data.shares || 0),
            polledAt: Number(data.at || 0),
          });
        }
      }
      return results;
    } catch { return []; }
  }

  async getAutoReplyStats(): Promise<Record<string, number>> {
    try {
      const raw = await this.redis.hgetall('fb:autoreplies');
      return Object.fromEntries(Object.entries(raw ?? {}).map(([k, v]) => [k, Number(v)]));
    } catch { return {}; }
  }
}

function now() { return Date.now(); }
