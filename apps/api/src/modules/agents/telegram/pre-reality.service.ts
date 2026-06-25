import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class PreRealityService {
  private readonly logger = new Logger(PreRealityService.name);

  private perceptionField: Map<string, number> = new Map();

  setPerception(productId: string, necessity: number): void {
    const clamped = Math.min(1, Math.max(0, necessity));
    this.perceptionField.set(productId, clamped);
    this.logger.debug(`Perception set: ${productId}=${clamped}`);
  }

  amplifyPerception(productId: string, delta: number): void {
    const current = this.perceptionField.get(productId) ?? 0;
    const updated = Math.min(1, Math.max(0, current + delta));
    this.perceptionField.set(productId, updated);
    this.logger.debug(`Perception amplified: ${productId} → ${updated}`);
  }

  getHighPerception(threshold: number): string[] {
    const result: string[] = [];
    for (const [id, val] of this.perceptionField.entries()) {
      if (val >= threshold) result.push(id);
    }
    return result;
  }

  decay(): void {
    for (const [id, val] of this.perceptionField.entries()) {
      const decayed = parseFloat((val * 0.95).toFixed(4));
      if (decayed < 0.001) {
        this.perceptionField.delete(id);
      } else {
        this.perceptionField.set(id, decayed);
      }
    }
  }

  @Cron('0 */6 * * *')
  perceptionDecay(): void {
    this.decay();
    this.logger.log(`Perception decay applied — ${this.perceptionField.size} products tracked`);
  }

  getStats() {
    const vals = Array.from(this.perceptionField.values());
    return {
      trackedProducts: this.perceptionField.size,
      avgPerception:
        vals.length > 0
          ? parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(4))
          : 0,
      highPerception: this.getHighPerception(0.7).length,
    };
  }
}
