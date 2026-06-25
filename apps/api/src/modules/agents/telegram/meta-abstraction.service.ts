import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MetaAbstractionService {
  private readonly logger = new Logger(MetaAbstractionService.name);
  private abstractions: Record<string, string[]> = {
    product: ['value abstraction', 'desire fulfillment unit', 'attention magnet'],
    funnel: ['attention flow', 'decision pathway', 'conversion cascade'],
    content: ['influence vector', 'narrative carrier', 'value signal'],
    traffic: ['probability distribution', 'attention stream', 'conversion potential flow'],
  };

  abstract(concept: 'product' | 'funnel' | 'content' | 'traffic'): string {
    const options = this.abstractions[concept] || ['undefined abstraction'];
    return options[Math.floor(Math.random() * options.length)];
  }

  addAbstraction(concept: string, abstraction: string): void {
    if (!this.abstractions[concept]) this.abstractions[concept] = [];
    if (!this.abstractions[concept].includes(abstraction)) this.abstractions[concept].push(abstraction);
  }

  getAbstractions(): Record<string, string[]> { return { ...this.abstractions }; }

  getStats() { return { concepts: Object.keys(this.abstractions).length, totalAbstractions: Object.values(this.abstractions).flat().length }; }
}
