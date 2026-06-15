import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { AiService } from '../ai/ai.service';
import { SelfImprovementService } from './self-improvement.service';
import { Product } from '../../database/entities/product.entity';
import { Customer } from '../../database/entities/customer.entity';
import { AiDecision, AiDecisionOutcome } from '../../database/entities/ai-decision.entity';
import { AgentName } from '../../database/entities/agent-log.entity';

export interface AutoAction {
  id: string;
  type: string;
  description: string;
  executedAt: Date;
  result: 'success' | 'skipped' | 'failed';
  detail: string;
}

@Injectable()
export class AutonomousExecutorService {
  private readonly logger = new Logger(AutonomousExecutorService.name);

  constructor(
    private readonly selfImprovement: SelfImprovementService,
    private readonly aiService: AiService,
    @InjectRepository(Product)    private readonly productRepo: Repository<Product>,
    @InjectRepository(Customer)   private readonly customerRepo: Repository<Customer>,
    @InjectRepository(AiDecision) private readonly decisionRepo: Repository<AiDecision>,
  ) {}

  // ─── F03: Auto Decisions ─────────────────────────────────────────────────

  async runAutoDecisions(): Promise<AutoAction[]> {
    const actions: AutoAction[] = [];
    const evaluation = await this.selfImprovement.evaluate();

    for (const failure of evaluation.failures) {
      let actionTaken: string;
      let outcome = AiDecisionOutcome.SUCCESS;

      if (failure.includes('leads')) {
        actionTaken = 'Đã đánh dấu để tạo lead capture campaign';
      } else if (failure.includes('agent') || failure.includes('Agents')) {
        actionTaken = 'Đã ghi nhận agent failure — cần restart thủ công';
      } else if (failure.includes('doanh thu')) {
        actionTaken = 'Flagged for human approval — flash sale campaign';
        outcome = AiDecisionOutcome.PENDING;
      } else {
        actionTaken = `Ghi nhận vấn đề: ${failure}`;
      }

      try {
        const saved = await this.decisionRepo.save(
          this.decisionRepo.create({
            agentName: AgentName.MASTER,
            decisionType: 'auto_decision',
            description: failure,
            decision: { action: actionTaken },
            outcome,
            confidence: 70,
          }),
        );

        actions.push({
          id: saved.id,
          type: 'auto_decision',
          description: failure,
          executedAt: saved.createdAt,
          result: outcome === AiDecisionOutcome.SUCCESS ? 'success' : 'skipped',
          detail: actionTaken,
        });
      } catch (e) {
        actions.push({
          id: `err_${Date.now()}`,
          type: 'auto_decision',
          description: failure,
          executedAt: new Date(),
          result: 'failed',
          detail: e.message,
        });
      }
    }

    return actions;
  }

  // ─── F03: Auto Optimization ───────────────────────────────────────────────

  async runAutoOptimization(): Promise<AutoAction[]> {
    const actions: AutoAction[] = [];

    // Flag low-trend products for review
    const lowTrendProducts = await this.productRepo.find({
      order: { trendScore: 'ASC' },
      take: 5,
    });

    for (const product of lowTrendProducts.filter((p) => (p.trendScore || 0) < 20 && p.stock > 0)) {
      try {
        const saved = await this.decisionRepo.save(
          this.decisionRepo.create({
            agentName: AgentName.MASTER,
            decisionType: 'product_optimization',
            description: `Low trend product: "${product.name}" (score ${product.trendScore})`,
            input: { productId: product.id, trendScore: product.trendScore, price: product.price },
            decision: { recommendation: 'Reduce price or increase content budget' },
            outcome: AiDecisionOutcome.PENDING,
            confidence: 60,
            relatedEntityType: 'product',
            relatedEntityId: product.id,
          }),
        );

        actions.push({
          id: saved.id,
          type: 'product_optimization',
          description: `Low trend product flagged: "${product.name}"`,
          executedAt: saved.createdAt,
          result: 'skipped',
          detail: 'Pending human approval to adjust price/campaign',
        });
      } catch (e) {
        this.logger.warn(`Auto optimization failed for ${product.id}: ${e.message}`);
      }
    }

    // Flag at-risk customers for churn intervention
    const atRiskCount = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.churnRisk >= 70')
      .getCount();

    if (atRiskCount > 0) {
      const saved = await this.decisionRepo.save(
        this.decisionRepo.create({
          agentName: AgentName.MASTER,
          decisionType: 'churn_intervention',
          description: `${atRiskCount} at-risk customers need retention action`,
          input: { atRiskCount },
          decision: { recommendedAction: 'Send win-back campaign with 20% coupon' },
          outcome: AiDecisionOutcome.PENDING,
          confidence: 80,
        }),
      );

      actions.push({
        id: saved.id,
        type: 'churn_monitoring',
        description: `${atRiskCount} khách hàng churn risk cao`,
        executedAt: saved.createdAt,
        result: 'success',
        detail: 'Flagged for retention campaign — pending approval',
      });
    }

    return actions;
  }

  // ─── F03: Full Autonomous Cycle ───────────────────────────────────────────

  async runAutonomousCycle(): Promise<{
    autoDecisions: AutoAction[];
    autoOptimizations: AutoAction[];
    summary: string;
    timestamp: Date;
  }> {
    this.logger.log('Autonomous executor: running full cycle...');

    const [autoDecisions, autoOptimizations] = await Promise.all([
      this.runAutoDecisions(),
      this.runAutoOptimization(),
    ]);

    const totalActions = autoDecisions.length + autoOptimizations.length;
    const successCount = [...autoDecisions, ...autoOptimizations].filter((a) => a.result === 'success').length;

    let summary: string;
    try {
      summary = await this.aiService.generate(
        `Autonomous cycle: ${totalActions} actions, ${successCount} thành công. Tóm tắt 1 câu.`,
        'Autonomous company AI. Tóm tắt ngắn gọn.',
      );
    } catch {
      summary = `Autonomous cycle: ${totalActions} hành động, ${successCount} thành công`;
    }

    return { autoDecisions, autoOptimizations, summary, timestamp: new Date() };
  }

  @Cron('0 */6 * * *')
  async scheduledAutonomousCycle(): Promise<void> {
    this.logger.log('Scheduled autonomous cycle starting...');
    await this.runAutonomousCycle();
  }

  async getPendingDecisions(): Promise<AiDecision[]> {
    return this.decisionRepo.find({
      where: { outcome: AiDecisionOutcome.PENDING },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async approveDecision(id: string): Promise<AiDecision> {
    await this.decisionRepo.update(id, { outcome: AiDecisionOutcome.SUCCESS });
    return this.decisionRepo.findOneByOrFail({ id });
  }

  async rejectDecision(id: string): Promise<AiDecision> {
    await this.decisionRepo.update(id, { outcome: AiDecisionOutcome.SKIPPED });
    return this.decisionRepo.findOneByOrFail({ id });
  }
}
