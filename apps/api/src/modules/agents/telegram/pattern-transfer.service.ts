import { Injectable, Logger } from '@nestjs/common';

interface Transfer {
  from: string;
  to: string;
  patternType: 'hook' | 'product' | 'channel';
  pattern: string;
  transferredAt: Date;
}

@Injectable()
export class PatternTransferService {
  private readonly logger = new Logger(PatternTransferService.name);
  private transfers: Transfer[] = [];

  private record(from: string, to: string, patternType: Transfer['patternType'], pattern: string): void {
    this.transfers.push({ from, to, patternType, pattern, transferredAt: new Date() });
    this.logger.log(`Pattern transfer [${patternType}] ${from} -> ${to}: ${pattern}`);
  }

  transferHook(from: string, to: string, hook: string): void {
    this.record(from, to, 'hook', hook);
  }

  transferProduct(from: string, to: string, product: string): void {
    this.record(from, to, 'product', product);
  }

  transferChannel(from: string, to: string, channel: string): void {
    this.record(from, to, 'channel', channel);
  }

  getTransferMap(): Record<string, Transfer[]> {
    const map: Record<string, Transfer[]> = {};
    for (const t of this.transfers) {
      if (!map[t.from]) map[t.from] = [];
      map[t.from].push(t);
    }
    return map;
  }

  getByUniverse(universeId: string): Transfer[] {
    return this.transfers.filter(t => t.from === universeId || t.to === universeId);
  }

  getStats() {
    const byType: Record<string, number> = { hook: 0, product: 0, channel: 0 };
    for (const t of this.transfers) byType[t.patternType]++;
    return { total: this.transfers.length, byType };
  }
}
