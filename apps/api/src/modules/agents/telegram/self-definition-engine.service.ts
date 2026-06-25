import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SelfDefinitionEngineService {
  private readonly logger = new Logger(SelfDefinitionEngineService.name);
  private definition = {
    identity: 'autonomous-affiliate-revenue-system',
    goal: 'maximize-stable-revenue',
    successMetric: 'daily-revenue-stability',
    evolutionStrategy: 'continuous-optimization',
  };
  private definitionHistory: Array<{ definition: typeof this.definition; changedAt: Date }> = [];

  redefine(newDef: Partial<typeof this.definition>): void {
    this.definitionHistory.push({ definition: { ...this.definition }, changedAt: new Date() });
    Object.assign(this.definition, newDef);
    this.logger.log(`Self-definition updated: ${JSON.stringify(newDef)}`);
  }

  getDefinition(): typeof this.definition { return { ...this.definition }; }

  getStats() { return { current: this.definition, historyLength: this.definitionHistory.length, lastChange: this.definitionHistory[this.definitionHistory.length - 1]?.changedAt }; }
}
