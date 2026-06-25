import { Injectable, Logger } from '@nestjs/common';

export interface EvolCondition { name: string; present: boolean; strength: number; }

@Injectable()
export class PreSystemEvolutionService {
  private readonly logger = new Logger(PreSystemEvolutionService.name);
  private evolutionConditions: EvolCondition[] = [
    { name: 'market_readiness', present: false, strength: 0 },
    { name: 'resource_abundance', present: false, strength: 0 },
    { name: 'strategy_maturity', present: false, strength: 0 },
  ];
  evolutionCount: number = 0;
  private evolutionLog: Array<{ conditions: string[]; timestamp: Date }> = [];

  setCondition(name: string, strength: number): void {
    let cond = this.evolutionConditions.find(c => c.name === name);
    if (!cond) { cond = { name, present: false, strength: 0 }; this.evolutionConditions.push(cond); }
    cond.strength = Math.max(0, Math.min(1, strength));
    cond.present = cond.strength > 0.3;
  }

  canEvolve(): boolean {
    return this.evolutionConditions.every(c => c.present && c.strength > 0.5);
  }

  evolve(): void {
    if (!this.canEvolve()) return;
    this.evolutionCount++;
    const activeConditions = this.evolutionConditions.filter(c => c.present).map(c => c.name);
    this.evolutionLog.push({ conditions: activeConditions, timestamp: new Date() });
    this.evolutionConditions.forEach(c => { c.strength *= 0.5; c.present = c.strength > 0.3; });
    this.logger.log(`Pre-system evolved #${this.evolutionCount}: [${activeConditions.join(', ')}]`);
  }

  getStats() { return { evolutionCount: this.evolutionCount, canEvolve: this.canEvolve(), conditions: this.evolutionConditions }; }
}
