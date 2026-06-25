import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IntelligenceCompressionService {
  private readonly logger = new Logger(IntelligenceCompressionService.name);
  private knowledgeBase = { patterns: [] as string[], strategies: [] as string[], behaviors: [] as string[], systemEfficiency: 1.0 };

  compress(data: Record<string, any>): string {
    const keys = Object.keys(data).join(',');
    const vals = Object.values(data).map(v => typeof v === 'number' ? v.toFixed(2) : String(v)).join('|');
    return `[${keys}]:[${vals}]`;
  }

  addPattern(pattern: string): void {
    if (!this.knowledgeBase.patterns.includes(pattern)) {
      this.knowledgeBase.patterns.push(pattern);
      this.knowledgeBase.systemEfficiency = Math.min(2.0, this.knowledgeBase.systemEfficiency + 0.01);
    }
  }

  addStrategy(strategy: string): void {
    if (!this.knowledgeBase.strategies.includes(strategy)) this.knowledgeBase.strategies.push(strategy);
  }

  addBehavior(behavior: string): void {
    if (!this.knowledgeBase.behaviors.includes(behavior)) this.knowledgeBase.behaviors.push(behavior);
  }

  getCompressedModel() { return { ...this.knowledgeBase }; }

  getStats() {
    return { patterns: this.knowledgeBase.patterns.length, strategies: this.knowledgeBase.strategies.length, behaviors: this.knowledgeBase.behaviors.length, efficiency: this.knowledgeBase.systemEfficiency };
  }
}
