import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { AffiliateTrackerService } from './affiliate-tracker.service';
import { ContentVariantService } from './content-variant.service';

export interface RankingDecision {
  action: 'POST' | 'SKIP' | 'BOOST' | 'REWRITE';
  confidence: number;
  reason: string;
}

@Injectable()
export class AiRankingAgentService {
  private readonly logger = new Logger(AiRankingAgentService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly tracker: AffiliateTrackerService,
    private readonly contentVariant: ContentVariantService,
  ) {}

  async decide(productId: string, productName: string, category: string): Promise<RankingDecision> {
    const product = this.tracker.getProduct(productId);
    const abStats = this.contentVariant.getStats().find(s => s.productId === productId);

    const totalImpressions = abStats?.stats.reduce((sum, s) => sum + s.impressions, 0) || 0;
    const clicks = product?.clicks || 0;
    const ctr = totalImpressions > 0 ? clicks / totalImpressions : 0;
    const bestVariantCtr = abStats
      ? Math.max(...abStats.stats.map(s => s.ctr))
      : 0;

    // Chưa đủ data → POST để thu thập
    if (totalImpressions < 3) {
      return { action: 'POST', confidence: 0.7, reason: `Chỉ ${totalImpressions} impressions — cần thêm data` };
    }

    // Zero click sau nhiều lần hiện → SKIP
    if (totalImpressions >= 5 && clicks === 0) {
      return { action: 'SKIP', confidence: 0.9, reason: `${totalImpressions} impressions nhưng 0 click` };
    }

    // CTR cao + nhiều click → BOOST
    if (ctr >= 0.08 && clicks >= 3) {
      return { action: 'BOOST', confidence: 0.92, reason: `CTR ${(ctr * 100).toFixed(1)}% với ${clicks} clicks — hiệu quả cao` };
    }

    // CTR thấp sau nhiều impressions → REWRITE hook
    if (ctr < 0.03 && totalImpressions >= 10) {
      return { action: 'REWRITE', confidence: 0.78, reason: `CTR ${(ctr * 100).toFixed(1)}% quá thấp sau ${totalImpressions} lần — đổi hook` };
    }

    // Case phức tạp — nhờ AI phân tích
    try {
      const prompt = `Phân tích hiệu quả affiliate post và quyết định action:

Sản phẩm: ${productName.slice(0, 60)}
Danh mục: ${category}
Impressions: ${totalImpressions}
Clicks: ${clicks}
CTR tổng: ${(ctr * 100).toFixed(2)}%
CTR variant tốt nhất: ${(bestVariantCtr * 100).toFixed(2)}%

Chọn action:
POST — đăng bình thường (cần thêm data hoặc CTR trung bình)
BOOST — đăng lại nhiều lần, đa kênh (CTR cao, nhiều click)
REWRITE — viết lại hook mới (CTR thấp nhưng sản phẩm còn tiềm năng)
SKIP — bỏ qua hoàn toàn (CTR rất thấp, đã thử nhiều lần)

Trả về JSON THUẦN (không markdown): {"action":"POST|BOOST|REWRITE|SKIP","confidence":0.0-1.0,"reason":"..."}`;

      const raw = await this.aiService.generate(prompt);
      const match = raw.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (['POST', 'BOOST', 'REWRITE', 'SKIP'].includes(parsed.action)) {
          this.logger.debug(`AI ranking [${productName.slice(0, 30)}]: ${parsed.action} (${(parsed.confidence * 100).toFixed(0)}%)`);
          return parsed as RankingDecision;
        }
      }
    } catch (e) {
      this.logger.debug(`AI ranking lỗi, dùng rule-based: ${e.message}`);
    }

    return { action: 'POST', confidence: 0.5, reason: 'Không xác định — đăng bình thường' };
  }
}
