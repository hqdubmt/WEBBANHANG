import { Injectable, Logger } from '@nestjs/common';

interface Investment {
  universeId: string;
  traffic: number;
  contentGen: number;
  aiCompute: number;
  postFreq: number;
}

@Injectable()
export class MultiverseInvestmentService {
  private readonly logger = new Logger(MultiverseInvestmentService.name);
  private portfolio: Map<string, Investment> = new Map();

  invest(universeId: string, investment: Partial<Investment>): void {
    const existing = this.portfolio.get(universeId) ?? {
      universeId,
      traffic: 0,
      contentGen: 0,
      aiCompute: 0,
      postFreq: 0,
    };
    this.portfolio.set(universeId, {
      ...existing,
      ...investment,
      universeId,
    });
    this.logger.log(`Invested in universe ${universeId}`);
  }

  divest(universeId: string, percent: number): void {
    const inv = this.portfolio.get(universeId);
    if (!inv) return;
    const factor = 1 - Math.min(1, Math.max(0, percent / 100));
    inv.traffic *= factor;
    inv.contentGen *= factor;
    inv.aiCompute *= factor;
    inv.postFreq *= factor;
    this.logger.log(`Divested ${percent}% from universe ${universeId}`);
  }

  reallocate(from: string, to: string, percent: number): void {
    const src = this.portfolio.get(from);
    if (!src) return;
    const factor = Math.min(1, Math.max(0, percent / 100));
    const transferred: Partial<Investment> = {
      traffic: src.traffic * factor,
      contentGen: src.contentGen * factor,
      aiCompute: src.aiCompute * factor,
      postFreq: src.postFreq * factor,
    };
    this.divest(from, percent);
    this.invest(to, transferred);
    this.logger.log(`Reallocated ${percent}% from ${from} to ${to}`);
  }

  getPortfolio(): Investment[] {
    return [...this.portfolio.values()];
  }

  getStats() {
    const totals = { traffic: 0, contentGen: 0, aiCompute: 0, postFreq: 0 };
    for (const inv of this.portfolio.values()) {
      totals.traffic += inv.traffic;
      totals.contentGen += inv.contentGen;
      totals.aiCompute += inv.aiCompute;
      totals.postFreq += inv.postFreq;
    }
    return { universes: this.portfolio.size, totals };
  }
}
