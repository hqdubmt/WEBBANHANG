import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { AiService } from '../ai/ai.service';
import { Campaign, CampaignStatus } from '../../database/entities/campaign.entity';

export interface CampaignPerformance {
  campaignId: string;
  name: string;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  score: number;
  verdict: 'excellent' | 'good' | 'average' | 'poor' | 'critical';
  aiSuggestion: string;
}

const POOR_THRESHOLD = 20;   // score below this triggers auto-pause

@Injectable()
export class CampaignOptimizationService {
  private readonly logger = new Logger(CampaignOptimizationService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly repo: Repository<Campaign>,
    private readonly aiService: AiService,
  ) {}

  // ─── F03: Performance Analysis ────────────────────────────────────────────

  async analyzePerformance(campaignId: string): Promise<CampaignPerformance> {
    const c = await this.repo.findOneByOrFail({ id: campaignId });

    const openRate       = c.sentCount > 0 ? (c.openCount / c.sentCount) * 100 : 0;
    const clickRate      = c.sentCount > 0 ? (c.clickCount / c.sentCount) * 100 : 0;
    const conversionRate = c.sentCount > 0 ? (c.conversionCount / c.sentCount) * 100 : 0;

    const score = Math.round(openRate * 0.3 + clickRate * 0.4 + conversionRate * 30 * 0.3);

    let verdict: CampaignPerformance['verdict'];
    if (score >= 70)      verdict = 'excellent';
    else if (score >= 50) verdict = 'good';
    else if (score >= 35) verdict = 'average';
    else if (score >= POOR_THRESHOLD) verdict = 'poor';
    else                  verdict = 'critical';

    const aiSuggestion = await this.getAiSuggestion(c, { openRate, clickRate, conversionRate, score });

    return {
      campaignId,
      name: c.name,
      openRate: Math.round(openRate * 10) / 10,
      clickRate: Math.round(clickRate * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      score,
      verdict,
      aiSuggestion,
    };
  }

  private async getAiSuggestion(
    campaign: Campaign,
    metrics: { openRate: number; clickRate: number; conversionRate: number; score: number },
  ): Promise<string> {
    try {
      return await this.aiService.generate(
        `Campaign "${campaign.name}" (${campaign.type}):
Open rate: ${metrics.openRate.toFixed(1)}%
Click rate: ${metrics.clickRate.toFixed(1)}%
Conversion rate: ${metrics.conversionRate.toFixed(1)}%
Score: ${metrics.score}/100

Nội dung hiện tại: ${(campaign.content || '').slice(0, 200)}

Đề xuất 1 cải tiến ngắn gọn (1-2 câu) để tăng conversion.`,
        'Bạn là marketing specialist. Trả lời thẳng vào đề xuất, không giải thích dài dòng.',
      );
    } catch {
      if (metrics.score < POOR_THRESHOLD) return 'Cần thay đổi nội dung và CTA, tỷ lệ conversion quá thấp.';
      return 'Hiệu suất ổn — thử A/B test tiêu đề để tăng open rate.';
    }
  }

  // ─── F03: A/B Test Simulation ─────────────────────────────────────────────

  async createAbTest(dto: {
    campaignId: string;
    variantContent: string;
    splitPercent?: number;
  }): Promise<{ original: Campaign; variant: Campaign }> {
    const original = await this.repo.findOneByOrFail({ id: dto.campaignId });

    const variant = await this.repo.save(
      this.repo.create({
        name:        `${original.name} [Variant B]`,
        type:        original.type,
        status:      CampaignStatus.DRAFT,
        subject:     original.subject,
        content:     dto.variantContent,
        segment:     original.segment,
        targetCount: Math.round((original.targetCount || 0) * ((dto.splitPercent || 50) / 100)),
        createdBy:   original.createdBy,
        meta:        {
          ...(original.meta || {}),
          abTest: { parentId: original.id, variant: 'B', splitPercent: dto.splitPercent || 50 },
        },
      }),
    );

    return { original, variant };
  }

  async compareAbTest(originalId: string, variantId: string) {
    const [orig, variant] = await Promise.all([
      this.analyzePerformance(originalId),
      this.analyzePerformance(variantId),
    ]);

    const winner = orig.score >= variant.score ? 'A' : 'B';

    return {
      variantA: orig,
      variantB: variant,
      winner,
      scoreDiff: Math.abs(orig.score - variant.score),
      recommendation: winner === 'A'
        ? `Giữ nguyên variant A — hiệu quả hơn ${(orig.score - variant.score).toFixed(1)} điểm.`
        : `Nâng cấp lên variant B — hiệu quả hơn ${(variant.score - orig.score).toFixed(1)} điểm.`,
    };
  }

  // ─── F03: Auto-Pause Poor Performers ──────────────────────────────────────

  @Cron('0 * * * *')
  async autoPausePoorPerformers(): Promise<void> {
    const running = await this.repo.find({ where: { status: CampaignStatus.RUNNING } });

    for (const campaign of running) {
      if (campaign.sentCount < 10) continue; // not enough data

      const openRate  = (campaign.openCount / campaign.sentCount) * 100;
      const clickRate = (campaign.clickCount / campaign.sentCount) * 100;
      const score = Math.round(openRate * 0.3 + clickRate * 0.4);

      if (score < POOR_THRESHOLD) {
        const updatedMeta: Record<string, any> = {
          ...(campaign.meta || {}),
          autoPaused: true,
          autoPausedAt: new Date().toISOString(),
          pauseScore: score,
        };
        await this.repo.update(campaign.id, {
          status: CampaignStatus.PAUSED,
          meta: updatedMeta as any,
        });
        this.logger.warn(`Campaign "${campaign.name}" auto-paused: score ${score} < ${POOR_THRESHOLD}`);
      }
    }
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getOptimizationReport(): Promise<{
    analyzed: CampaignPerformance[];
    avgScore: number;
    excellentCount: number;
    poorCount: number;
  }> {
    const running = await this.repo.find({
      where: { status: CampaignStatus.RUNNING },
      take: 20,
    });

    const analyzed = await Promise.all(running.map((c) => this.analyzePerformance(c.id)));

    const avgScore = analyzed.length
      ? Math.round(analyzed.reduce((s, a) => s + a.score, 0) / analyzed.length)
      : 0;

    return {
      analyzed,
      avgScore,
      excellentCount: analyzed.filter((a) => a.verdict === 'excellent').length,
      poorCount:      analyzed.filter((a) => a.verdict === 'poor' || a.verdict === 'critical').length,
    };
  }
}
