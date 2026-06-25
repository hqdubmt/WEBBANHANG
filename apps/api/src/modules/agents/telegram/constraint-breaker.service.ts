import { Injectable, Logger } from '@nestjs/common';

export interface Constraint { type: 'model' | 'channel' | 'content' | 'traffic'; description: string; detectedAt: Date; broken: boolean; }

@Injectable()
export class ConstraintBreakerService {
  private readonly logger = new Logger(ConstraintBreakerService.name);
  private constraints: Constraint[] = [];

  detectConstraint(metric: string, value: number, threshold: number): Constraint | null {
    if (value >= threshold) return null;
    const type = metric.includes('channel') ? 'channel' : metric.includes('content') ? 'content' : metric.includes('traffic') ? 'traffic' : 'model';
    const c: Constraint = { type, description: `${metric} = ${value} below ${threshold}`, detectedAt: new Date(), broken: false };
    this.constraints.push(c);
    return c;
  }

  breakConstraint(constraint: Constraint): void {
    constraint.broken = true;
    this.logger.log(`Constraint broken: ${constraint.description}`);
  }

  getActiveConstraints(): Constraint[] {
    return this.constraints.filter(c => !c.broken);
  }

  getStats() {
    return { total: this.constraints.length, active: this.getActiveConstraints().length, broken: this.constraints.filter(c => c.broken).length };
  }
}
