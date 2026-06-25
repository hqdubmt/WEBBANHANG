import { Injectable, Logger } from '@nestjs/common';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { ProfitScoreService } from './profit-score.service';
import { ProductLifecycleService } from './product-lifecycle.service';
import { EventCollectorService } from './event-collector.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';

export interface InsightResult {
  question: string;
  answer: string;
  data: Record<string, unknown>;
  generatedAt: Date;
}

@Injectable()
export class AiInsightService {
  private readonly logger = new Logger(AiInsightService.name);

  constructor(
    private readonly analytics: RevenueAnalyticsService,
    private readonly profitScore: ProfitScoreService,
    private readonly lifecycle: ProductLifecycleService,
    private readonly events: EventCollectorService,
    private readonly tracker: AffiliateTrackerService,
  ) {}

  // "vì sao sản phẩm A bán tốt"
  explainProductSuccess(productId: string): InsightResult {
    const product = this.tracker.getProduct(productId);
    const score = this.profitScore.compute(productId);
    const entry = this.lifecycle.getEntry(productId);

    const reasons: string[] = [];

    if (score.ctrScore >= 20) reasons.push(`CTR cao (${Math.round(score.ctrScore / 30 * 100)}% of max) — nội dung hấp dẫn người xem click`);
    if (score.cvrScore >= 15) reasons.push(`Tốc độ click nhanh — sản phẩm đang trending trong 24h gần đây`);
    if (score.discountScore >= 12) reasons.push(`Mức giảm giá mạnh (${entry?.discountPct || '?'}%) — kích thích mua hàng`);
    if (score.trendScore >= 8) reasons.push(`Trend velocity cao — lượt click gần đây vượt trung bình lịch sử`);
    if (score.qualityScore >= 6) reasons.push(`Phân phối đa kênh hiệu quả — nhiều kênh đều có lượt click`);

    const answer = reasons.length > 0
      ? `Sản phẩm "${product?.name?.slice(0, 50) || productId}" bán tốt vì:\n${reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
      : `Sản phẩm "${product?.name?.slice(0, 50) || productId}" chưa có đủ dữ liệu để phân tích (score=${score.total}/100).`;

    return {
      question: `Vì sao sản phẩm ${productId} bán tốt?`,
      answer,
      data: { score, clicks: product?.clicks, stage: entry?.stage },
      generatedAt: new Date(),
    };
  }

  // "vì sao Telegram tốt hơn Facebook"
  compareChannels(channelA: string, channelB: string): InsightResult {
    const clicksA = this.events.getClicksByChannel(86_400_000)[channelA] || 0;
    const clicksB = this.events.getClicksByChannel(86_400_000)[channelB] || 0;
    const total = clicksA + clicksB;

    let answer: string;
    if (total === 0) {
      answer = `Chưa có đủ dữ liệu click trong 24h để so sánh ${channelA} vs ${channelB}.`;
    } else if (clicksA > clicksB) {
      const pct = total > 0 ? Math.round((clicksA / total) * 100) : 0;
      answer = `${channelA} hiệu quả hơn ${channelB} (${pct}% tổng click trong 24h).\n` +
        `${channelA}: ${clicksA} clicks | ${channelB}: ${clicksB} clicks.\n` +
        `Nguyên nhân: audience ${channelA} có độ tập trung cao hơn → CTR tốt hơn.`;
    } else if (clicksB > clicksA) {
      const pct = total > 0 ? Math.round((clicksB / total) * 100) : 0;
      answer = `${channelB} hiệu quả hơn ${channelA} (${pct}% tổng click trong 24h).\n` +
        `${channelB}: ${clicksB} clicks | ${channelA}: ${clicksA} clicks.`;
    } else {
      answer = `${channelA} và ${channelB} có hiệu quả tương đương (${clicksA} clicks mỗi kênh trong 24h).`;
    }

    return {
      question: `So sánh ${channelA} và ${channelB}`,
      answer,
      data: { [channelA]: clicksA, [channelB]: clicksB },
      generatedAt: new Date(),
    };
  }

  // "hook nào hiệu quả nhất"
  explainBestHook(): InsightResult {
    const report = this.analytics.generateReport();
    const bestHour = report.bestHours[0];
    const bestChannel = report.topChannels[0];
    const topCat = this.analytics.getTopCategoryByClicks();
    const winners = this.lifecycle.getWinners().slice(0, 3);

    const answer = [
      `📊 Tổng quan hiệu suất:`,
      `• Kênh tốt nhất: ${bestChannel?.channel || 'chưa có dữ liệu'} (${bestChannel?.clicks || 0} clicks/24h)`,
      `• Giờ đăng tốt nhất: ${bestHour?.label || 'chưa xác định'} (${bestHour?.clicks || 0} clicks)`,
      `• Danh mục bán chạy: ${topCat}`,
      ``,
      `🏆 Top WINNER hiện tại:`,
      ...winners.map((w, i) => `${i + 1}. ${w.productName.slice(0, 50)} (score=${w.profitScore})`),
      ``,
      `💡 Gợi ý: Đăng nhiều hơn lúc ${bestHour?.label || '?'} trên kênh ${bestChannel?.channel || 'telegram'} với danh mục ${topCat}.`,
    ].join('\n');

    return {
      question: 'Hook nào hiệu quả nhất? Tổng quan hệ thống?',
      answer,
      data: report as any,
      generatedAt: new Date(),
    };
  }

  // Tóm tắt toàn hệ thống thành 1 báo cáo dạng text
  generateDailyBrief(): string {
    const report = this.analytics.generateReport();
    const lines: string[] = [
      `📈 *DAILY REVENUE BRIEF* — ${new Date().toLocaleDateString('vi-VN')}`,
      ``,
      `🛒 *Sản phẩm*: ${report.totalProductsTracked} tracked | 🏆 ${report.winnersCount} winners | ❌ ${report.losersCount} losers`,
      `📊 *Click 24h*: ${report.totalClicks24h} lượt`,
      ``,
      `🔝 *Top sản phẩm*:`,
      ...report.topProducts.slice(0, 5).map((p, i) =>
        `${i + 1}. ${p.name.slice(0, 40)} [${p.profitTier}] ${p.clicks} clicks`
      ),
      ``,
      `📡 *Kênh hiệu quả*:`,
      ...report.topChannels.slice(0, 3).map(c => `• ${c.channel}: ${c.clicks} clicks (${c.share}%)`),
      ``,
      `⏰ *Giờ đăng tốt*: ${report.bestHours.slice(0, 3).map(h => h.label).join(', ')}`,
    ];
    return lines.join('\n');
  }
}
