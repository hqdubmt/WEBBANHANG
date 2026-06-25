import { Injectable, Logger } from '@nestjs/common';

interface Insight {
  level: string;
  insight: string;
  timestamp: Date;
}

@Injectable()
export class MetaLearningEngineService {
  private readonly logger = new Logger(MetaLearningEngineService.name);
  private learningLevels = {
    strategyLevel: 0,
    systemLevel: 0,
    algorithmLevel: 0,
  };
  private insights: Insight[] = [];

  learnStrategy(outcome: 'success' | 'failure', strategy: Record<string, any>): void {
    const delta = outcome === 'success' ? 0.05 : -0.02;
    this.learningLevels.strategyLevel = Math.max(0, this.learningLevels.strategyLevel + delta);
    const insight = `Strategy ${outcome}: ${JSON.stringify(strategy).slice(0, 80)}`;
    this.insights.push({ level: 'strategy', insight, timestamp: new Date() });
    this.logger.log(`Strategy learning: ${outcome}, level=${this.learningLevels.strategyLevel.toFixed(3)}`);
  }

  learnSystem(pattern: string, value: number): void {
    const normalized = Math.min(1, Math.max(-1, value / 1000));
    this.learningLevels.systemLevel = Math.min(
      10,
      this.learningLevels.systemLevel + normalized * 0.1,
    );
    this.insights.push({
      level: 'system',
      insight: `Pattern [${pattern}] value=${value}`,
      timestamp: new Date(),
    });
  }

  learnAlgorithm(improvementType: string): void {
    this.learningLevels.algorithmLevel += 0.1;
    this.insights.push({
      level: 'algorithm',
      insight: `Algorithm improved: ${improvementType}`,
      timestamp: new Date(),
    });
    this.logger.log(`Algorithm learning: ${improvementType}, level=${this.learningLevels.algorithmLevel.toFixed(2)}`);
  }

  getLearningState(): typeof this.learningLevels {
    return { ...this.learningLevels };
  }

  getInsights(level?: string): Insight[] {
    return level ? this.insights.filter(i => i.level === level) : this.insights;
  }

  getStats() {
    return {
      levels: this.getLearningState(),
      totalInsights: this.insights.length,
      byLevel: {
        strategy: this.insights.filter(i => i.level === 'strategy').length,
        system: this.insights.filter(i => i.level === 'system').length,
        algorithm: this.insights.filter(i => i.level === 'algorithm').length,
      },
    };
  }
}
