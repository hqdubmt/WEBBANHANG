import { Injectable, Logger } from '@nestjs/common';

interface EvalResult {
  revenuePerDay: number;
  ctrStability: number;
  conversionRate: number;
  cost: number;
  saturation: number;
  verdict: 'KEEP' | 'MODIFY' | 'KILL' | 'MERGE';
}

@Injectable()
export class StrategyEvaluatorService {
  private readonly logger = new Logger(StrategyEvaluatorService.name);

  private evaluations: Map<string, EvalResult> = new Map();

  private calcVerdict(metrics: Partial<EvalResult>): 'KEEP' | 'MODIFY' | 'KILL' | 'MERGE' {
    const rev = metrics.revenuePerDay ?? 0;
    const ctr = metrics.ctrStability ?? 0;
    const conv = metrics.conversionRate ?? 0;
    const sat = metrics.saturation ?? 0;

    if (rev > 500 && conv > 3 && sat < 50) return 'KEEP';
    if (rev < 50 && conv < 0.5) return 'KILL';
    if (sat > 80 || ctr < 0.2) return 'MODIFY';
    return 'MERGE';
  }

  evaluate(strategyId: string, metrics: Partial<EvalResult>): EvalResult {
    const existing = this.evaluations.get(strategyId) ?? {
      revenuePerDay: 0,
      ctrStability: 0,
      conversionRate: 0,
      cost: 0,
      saturation: 0,
      verdict: 'MODIFY' as const,
    };

    const merged: EvalResult = {
      revenuePerDay: metrics.revenuePerDay ?? existing.revenuePerDay,
      ctrStability: metrics.ctrStability ?? existing.ctrStability,
      conversionRate: metrics.conversionRate ?? existing.conversionRate,
      cost: metrics.cost ?? existing.cost,
      saturation: metrics.saturation ?? existing.saturation,
      verdict: 'MODIFY',
    };
    merged.verdict = this.calcVerdict(merged);
    this.evaluations.set(strategyId, merged);
    this.logger.log(`Evaluated ${strategyId}: verdict=${merged.verdict}`);
    return merged;
  }

  getVerdict(strategyId: string): string {
    return this.evaluations.get(strategyId)?.verdict ?? 'UNKNOWN';
  }

  getAll(): EvalResult[] {
    return [...this.evaluations.values()];
  }

  getStats() {
    const verdictCounts: Record<string, number> = { KEEP: 0, MODIFY: 0, KILL: 0, MERGE: 0 };
    for (const e of this.evaluations.values()) verdictCounts[e.verdict] = (verdictCounts[e.verdict] ?? 0) + 1;
    return {
      totalEvaluated: this.evaluations.size,
      verdictCounts,
    };
  }

  getStatus() {
    return this.getStats();
  }
}
