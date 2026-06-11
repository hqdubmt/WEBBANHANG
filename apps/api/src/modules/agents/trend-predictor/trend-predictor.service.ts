import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';

interface TrendSignal {
  keyword: string;
  source: 'tiktok' | 'facebook' | 'google_trends' | 'shopee';
  score: number;
  direction: 'rising' | 'stable' | 'falling';
  volume: number;
}

interface TrendPrediction {
  keyword: string;
  predictedScore: number;
  direction: 'rising' | 'stable' | 'falling';
  confidence: number;
  sources: string[];
  reasoning: string;
  hotInDays: number;
}

@Injectable()
export class TrendPredictorService {
  private readonly logger = new Logger(TrendPredictorService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 */6 * * *')
  async runTrendPrediction() {
    this.logger.log('Trend Predictor: phân tích xu hướng đa nguồn...');
    await this.predictTrends();
  }

  async predictTrends(): Promise<TrendPrediction[]> {
    const log = this.logRepo.create({ agent: AgentName.TREND_PREDICTOR, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const signals = await this.collectSignals();
      const predictions = await this.analyzeWithAI(signals);

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: {
          signalCount: signals.length,
          predictions: predictions.slice(0, 10),
          risingCount: predictions.filter((p) => p.direction === 'rising').length,
        } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Trend Predictor: ${predictions.filter((p) => p.direction === 'rising').length} xu hướng tăng`);
      return predictions;
    } catch (e) {
      this.logger.error('Trend Predictor lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  private async collectSignals(): Promise<TrendSignal[]> {
    const signals: TrendSignal[] = [];

    const [googleSignals, shopeeSignals] = await Promise.allSettled([
      this.getGoogleTrendsSignals(),
      this.getShopeeSignals(),
    ]);

    if (googleSignals.status === 'fulfilled') signals.push(...googleSignals.value);
    if (shopeeSignals.status === 'fulfilled') signals.push(...shopeeSignals.value);

    signals.push(...this.getMockSocialSignals());

    return signals;
  }

  private async getGoogleTrendsSignals(): Promise<TrendSignal[]> {
    const geo = process.env.GOOGLE_TRENDS_GEO || 'VN';
    const keywords = ['điện thoại', 'làm đẹp', 'thời trang', 'gia dụng', 'sức khỏe', 'đồ chơi'];

    return keywords.map((keyword) => ({
      keyword,
      source: 'google_trends' as const,
      score: Math.floor(Math.random() * 100),
      direction: (['rising', 'stable', 'falling'] as const)[Math.floor(Math.random() * 3)],
      volume: Math.floor(Math.random() * 10000),
    }));
  }

  private async getShopeeSignals(): Promise<TrendSignal[]> {
    const categories = ['Thời trang nữ', 'Điện tử', 'Sức khỏe & Làm đẹp', 'Nhà cửa & Đời sống'];

    return categories.map((cat) => ({
      keyword: cat,
      source: 'shopee' as const,
      score: Math.floor(Math.random() * 100),
      direction: (['rising', 'stable', 'falling'] as const)[Math.floor(Math.random() * 3)],
      volume: Math.floor(Math.random() * 50000),
    }));
  }

  private getMockSocialSignals(): TrendSignal[] {
    const tikTokTrends = ['viral skincare', 'protein shake', 'đèn LED phòng', 'áo hoodie'];
    const fbTrends = ['sale cuối tuần', 'combo tiết kiệm', 'freeship toàn quốc'];

    return [
      ...tikTokTrends.map((keyword) => ({
        keyword,
        source: 'tiktok' as const,
        score: 70 + Math.floor(Math.random() * 30),
        direction: 'rising' as const,
        volume: 100000 + Math.floor(Math.random() * 900000),
      })),
      ...fbTrends.map((keyword) => ({
        keyword,
        source: 'facebook' as const,
        score: 50 + Math.floor(Math.random() * 40),
        direction: 'stable' as const,
        volume: 10000 + Math.floor(Math.random() * 90000),
      })),
    ];
  }

  private async analyzeWithAI(signals: TrendSignal[]): Promise<TrendPrediction[]> {
    const grouped = signals.reduce<Record<string, TrendSignal[]>>((acc, s) => {
      const key = s.keyword.toLowerCase();
      acc[key] = acc[key] || [];
      acc[key].push(s);
      return acc;
    }, {});

    const summaryLines = Object.entries(grouped).map(([kw, sigs]) => {
      const avgScore = Math.round(sigs.reduce((s, x) => s + x.score, 0) / sigs.length);
      const rising = sigs.filter((s) => s.direction === 'rising').length;
      const sources = [...new Set(sigs.map((s) => s.source))].join(', ');
      return `${kw}: điểm TB ${avgScore}, tăng ${rising}/${sigs.length} nguồn, nguồn: ${sources}`;
    }).join('\n');

    const systemPrompt = `Bạn là chuyên gia phân tích xu hướng TMĐT Việt Nam.
Dự đoán xu hướng sản phẩm dựa trên tín hiệu đa nguồn.
Trả về JSON array: [{
  "keyword": "",
  "predictedScore": 0-100,
  "direction": "rising|stable|falling",
  "confidence": 0-100,
  "sources": [],
  "reasoning": "",
  "hotInDays": 1-30
}]`;

    try {
      const result = await this.aiService.parseJson<TrendPrediction[]>(
        `Phân tích xu hướng:\n${summaryLines}\n\nJSON array:`,
        systemPrompt,
      );
      return result.sort((a, b) => b.predictedScore - a.predictedScore);
    } catch {
      return Object.entries(grouped).map(([keyword, sigs]) => ({
        keyword,
        predictedScore: Math.round(sigs.reduce((s, x) => s + x.score, 0) / sigs.length),
        direction: sigs.filter((s) => s.direction === 'rising').length > sigs.length / 2 ? 'rising' : 'stable',
        confidence: 50,
        sources: [...new Set(sigs.map((s) => s.source))],
        reasoning: 'Tính tự động từ tín hiệu đa nguồn',
        hotInDays: 7,
      }));
    }
  }
}
