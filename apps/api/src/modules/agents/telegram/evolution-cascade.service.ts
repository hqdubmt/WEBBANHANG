import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EvolutionCascadeService {
  private readonly logger = new Logger(EvolutionCascadeService.name);
  readonly layers = ['product', 'funnel', 'strategy', 'economy', 'civilization', 'multiverse', 'reality', 'meta'];
  private currentLayer: number = 0;
  private cascadeLog: Array<{ layer: string; evolutionType: string; timestamp: Date }> = [];

  advance(): void {
    this.currentLayer = (this.currentLayer + 1) % this.layers.length;
    this.logger.log(`Evolution cascade advanced to layer: ${this.layers[this.currentLayer]}`);
  }

  recordEvolution(evolutionType: string): void {
    const layer = this.layers[this.currentLayer];
    this.cascadeLog.push({ layer, evolutionType, timestamp: new Date() });
    this.logger.log(`Evolution recorded at ${layer}: ${evolutionType}`);
  }

  getCurrentLayer(): string { return this.layers[this.currentLayer]; }

  getStats() {
    return { currentLayer: this.getCurrentLayer(), layerIndex: this.currentLayer, totalEvolutions: this.cascadeLog.length, log: this.cascadeLog.slice(-5) };
  }
}
