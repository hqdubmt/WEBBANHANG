import { Injectable, Logger } from '@nestjs/common';

interface ProbField {
  attentionProb: number;
  interestProb: number;
  actionProb: number;
  updatedAt: Date;
}

@Injectable()
export class ProbabilityFieldService {
  private readonly logger = new Logger(ProbabilityFieldService.name);

  private fields: Map<string, ProbField> = new Map();

  set(contextId: string, field: Partial<ProbField>): void {
    const existing = this.fields.get(contextId) ?? {
      attentionProb: 0,
      interestProb: 0,
      actionProb: 0,
      updatedAt: new Date(),
    };
    this.fields.set(contextId, {
      ...existing,
      ...field,
      updatedAt: new Date(),
    });
    this.logger.debug(`ProbField set for context[${contextId}]`);
  }

  get(contextId: string): ProbField | undefined {
    return this.fields.get(contextId);
  }

  amplify(contextId: string, factor: number): void {
    const field = this.fields.get(contextId);
    if (!field) return;
    field.attentionProb = Math.min(1, field.attentionProb * factor);
    field.interestProb = Math.min(1, field.interestProb * factor);
    field.actionProb = Math.min(1, field.actionProb * factor);
    field.updatedAt = new Date();
    this.logger.debug(`ProbField amplified[${contextId}] factor=${factor}`);
  }

  getHighProbabilityContexts(threshold: number): string[] {
    const result: string[] = [];
    for (const [id, field] of this.fields.entries()) {
      if (field.actionProb >= threshold) {
        result.push(id);
      }
    }
    return result;
  }

  getStats() {
    const vals = Array.from(this.fields.values());
    return {
      totalContexts: this.fields.size,
      avgActionProb:
        vals.length > 0
          ? parseFloat((vals.reduce((s, f) => s + f.actionProb, 0) / vals.length).toFixed(4))
          : 0,
      highProbabilityContexts: this.getHighProbabilityContexts(0.7).length,
    };
  }
}
