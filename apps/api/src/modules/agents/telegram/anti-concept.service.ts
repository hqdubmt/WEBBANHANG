import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AntiConceptService {
  private readonly logger = new Logger(AntiConceptService.name);
  private negations: Map<string, boolean> = new Map([['traffic', false], ['conversion', false], ['content', false], ['system', false]]);

  negate(concept: string): void {
    this.negations.set(concept, true);
    this.logger.log(`Concept negated: ${concept}`);
  }

  restore(concept: string): void {
    this.negations.set(concept, false);
    this.logger.log(`Concept restored: ${concept}`);
  }

  getActiveNegations(): string[] {
    return Array.from(this.negations.entries()).filter(([, v]) => v).map(([k]) => k);
  }

  applyNegation(output: Record<string, any>): Record<string, any> {
    const negated = this.getActiveNegations();
    const result: Record<string, any> = { ...output };
    for (const concept of negated) {
      if (concept in result) delete result[concept];
    }
    return result;
  }

  getStats() { return { totalConcepts: this.negations.size, activeNegations: this.getActiveNegations().length, negated: this.getActiveNegations() }; }
}
