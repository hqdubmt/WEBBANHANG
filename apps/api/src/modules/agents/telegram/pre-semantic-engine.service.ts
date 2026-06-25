import { Injectable, Logger } from '@nestjs/common';

interface SemanticVector {
  attentionDirection: number;
  interestGradient: number;
  propagationForce: number;
}

@Injectable()
export class PreSemanticEngineService {
  private readonly logger = new Logger(PreSemanticEngineService.name);

  private vectors: Map<string, SemanticVector> = new Map();

  setVector(id: string, v: SemanticVector): void {
    this.vectors.set(id, { ...v });
    this.logger.debug(`Set vector[${id}]: ${JSON.stringify(v)}`);
  }

  getVector(id: string): SemanticVector | undefined {
    return this.vectors.get(id);
  }

  computeResonance(v1: SemanticVector, v2: SemanticVector): number {
    const dot =
      v1.attentionDirection * v2.attentionDirection +
      v1.interestGradient * v2.interestGradient +
      v1.propagationForce * v2.propagationForce;
    const mag1 = Math.sqrt(
      v1.attentionDirection ** 2 + v1.interestGradient ** 2 + v1.propagationForce ** 2,
    );
    const mag2 = Math.sqrt(
      v2.attentionDirection ** 2 + v2.interestGradient ** 2 + v2.propagationForce ** 2,
    );
    if (mag1 === 0 || mag2 === 0) return 0;
    return parseFloat((dot / (mag1 * mag2)).toFixed(4));
  }

  aggregate(): SemanticVector {
    if (this.vectors.size === 0) {
      return { attentionDirection: 0, interestGradient: 0, propagationForce: 0 };
    }
    const vals = Array.from(this.vectors.values());
    const count = vals.length;
    return {
      attentionDirection: vals.reduce((s, v) => s + v.attentionDirection, 0) / count,
      interestGradient: vals.reduce((s, v) => s + v.interestGradient, 0) / count,
      propagationForce: vals.reduce((s, v) => s + v.propagationForce, 0) / count,
    };
  }

  getStats() {
    return {
      vectorCount: this.vectors.size,
      aggregate: this.aggregate(),
      ids: Array.from(this.vectors.keys()),
    };
  }
}
