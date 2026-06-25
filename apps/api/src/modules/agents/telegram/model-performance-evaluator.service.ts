import { Injectable, Logger } from '@nestjs/common';

export interface PerfEval {
  modelId: string;
  roi: number;
  scalability: number;
  saturation: number;
  dependencyRisk: number;
  verdict: 'SCALE' | 'MAINTAIN' | 'DOWNGRADE' | 'STOP';
  evaluatedAt: Date;
}

@Injectable()
export class ModelPerformanceEvaluatorService {
  private readonly logger = new Logger(ModelPerformanceEvaluatorService.name);

  evaluations: Map<string, PerfEval> = new Map();

  evaluate(modelId: string, roi: number, scalability: number, saturation: number): PerfEval {
    const dependencyRisk = Math.max(0, 1 - scalability + saturation * 0.5);
    let verdict: PerfEval['verdict'];

    if (roi > 3 && scalability > 0.7 && saturation < 0.5) {
      verdict = 'SCALE';
    } else if (roi > 1.5 && saturation < 0.75) {
      verdict = 'MAINTAIN';
    } else if (roi > 0.5) {
      verdict = 'DOWNGRADE';
    } else {
      verdict = 'STOP';
    }

    const eval_: PerfEval = {
      modelId,
      roi,
      scalability,
      saturation,
      dependencyRisk,
      verdict,
      evaluatedAt: new Date(),
    };

    this.evaluations.set(modelId, eval_);
    this.logger.log(`Evaluated ${modelId}: ${verdict} (ROI=${roi.toFixed(2)})`);
    return eval_;
  }

  getVerdict(modelId: string): string {
    return this.evaluations.get(modelId)?.verdict ?? 'UNKNOWN';
  }

  getAllEvals(): PerfEval[] {
    return Array.from(this.evaluations.values());
  }

  getStats() {
    const evals = this.getAllEvals();
    const verdictCounts: Record<string, number> = { SCALE: 0, MAINTAIN: 0, DOWNGRADE: 0, STOP: 0 };
    for (const e of evals) verdictCounts[e.verdict] = (verdictCounts[e.verdict] ?? 0) + 1;
    const avgRoi = evals.length ? evals.reduce((s, e) => s + e.roi, 0) / evals.length : 0;
    return {
      totalEvaluations: evals.length,
      verdictCounts,
      avgRoi: +avgRoi.toFixed(2),
    };
  }

  getStatus() {
    return { evaluated: this.evaluations.size };
  }
}
