import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

interface PossibilityField {
  attentionPotential: number;
  behaviorGradient: number;
  viralForce: number;
  timestamp: Date;
}

@Injectable()
export class PreconceptFieldGeneratorService {
  private readonly logger = new Logger(PreconceptFieldGeneratorService.name);

  private field: PossibilityField = this.generateField();
  private fieldHistory: PossibilityField[] = [];

  generateField(): PossibilityField {
    const seed = Date.now() % 1000;
    const rng = (offset: number) => ((Math.sin(seed + offset) + 1) / 2);
    return {
      attentionPotential: parseFloat(rng(1).toFixed(4)),
      behaviorGradient: parseFloat(rng(2).toFixed(4)),
      viralForce: parseFloat(rng(3).toFixed(4)),
      timestamp: new Date(),
    };
  }

  updateField(delta: Partial<PossibilityField>): void {
    this.fieldHistory.push({ ...this.field });
    if (this.fieldHistory.length > 100) this.fieldHistory.shift();
    this.field = {
      ...this.field,
      ...delta,
      timestamp: new Date(),
    };
    this.logger.debug(`Field updated: ${JSON.stringify(this.field)}`);
  }

  getField(): PossibilityField {
    return { ...this.field };
  }

  @Cron('0 */1 * * *')
  refreshField(): void {
    const newField = this.generateField();
    this.fieldHistory.push({ ...this.field });
    if (this.fieldHistory.length > 100) this.fieldHistory.shift();
    this.field = newField;
    this.logger.log(`Field refreshed — attentionPotential=${this.field.attentionPotential}`);
  }

  getStats() {
    return {
      currentField: this.field,
      historyCount: this.fieldHistory.length,
      avgAttentionPotential:
        this.fieldHistory.length > 0
          ? this.fieldHistory.reduce((s, f) => s + f.attentionPotential, 0) / this.fieldHistory.length
          : this.field.attentionPotential,
    };
  }
}
