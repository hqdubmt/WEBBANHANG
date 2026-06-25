import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ZeroSemanticProcessorService {
  private readonly logger = new Logger(ZeroSemanticProcessorService.name);
  private processed: Array<{ inputHash: string; pattern: string; timestamp: Date }> = [];

  private hashAny(data: any): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
    return hash.toString(16);
  }

  extractPattern(data: any): string {
    if (typeof data === 'number') return data > 0 ? 'positive_numeric' : data < 0 ? 'negative_numeric' : 'zero';
    if (typeof data === 'string') return data.length > 50 ? 'long_text' : data.length > 0 ? 'short_text' : 'empty';
    if (Array.isArray(data)) return `array_${data.length}`;
    if (typeof data === 'object' && data !== null) return `object_${Object.keys(data).length}k`;
    return 'null_pattern';
  }

  process(rawInput: any): string {
    const hash = this.hashAny(rawInput);
    const pattern = this.extractPattern(rawInput);
    this.processed.push({ inputHash: hash, pattern, timestamp: new Date() });
    return pattern;
  }

  getPatterns(): string[] { return [...new Set(this.processed.map(p => p.pattern))]; }

  getStats() { return { processed: this.processed.length, uniquePatterns: this.getPatterns().length }; }
}
