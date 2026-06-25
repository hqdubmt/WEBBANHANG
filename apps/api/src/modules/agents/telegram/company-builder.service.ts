import { Injectable, Logger } from '@nestjs/common';

export interface MiniCompany {
  id: string;
  name: string;
  sector: string;
  pipeline: string[];
  traffic: number;
  revenue: number;
  active: boolean;
}

@Injectable()
export class CompanyBuilderService {
  private readonly logger = new Logger(CompanyBuilderService.name);

  companies: Map<string, MiniCompany> = new Map();
  private counter = 0;

  private readonly defaultPipelines: Record<string, string[]> = {
    affiliate: ['traffic-gen', 'content-post', 'link-track', 'payout'],
    content: ['research', 'write', 'publish', 'promote'],
    flashdeal: ['scrape-deals', 'rank', 'post', 'track'],
    review: ['product-find', 'review-write', 'distribute', 'monetize'],
  };

  createCompany(name: string, sector: string): MiniCompany {
    const id = `co-${++this.counter}-${Date.now()}`;
    const pipeline = this.defaultPipelines[sector] ?? ['init', 'run', 'track'];
    const company: MiniCompany = {
      id,
      name,
      sector,
      pipeline: [...pipeline],
      traffic: 1000,
      revenue: 500,
      active: true,
    };
    this.companies.set(id, company);
    this.logger.log(`Created company: ${name} [${id}] sector=${sector}`);
    return company;
  }

  addPipeline(companyId: string, pipeline: string): void {
    const company = this.companies.get(companyId);
    if (!company || !company.active) return;
    if (!company.pipeline.includes(pipeline)) {
      company.pipeline.push(pipeline);
      this.companies.set(companyId, company);
      this.logger.log(`Added pipeline "${pipeline}" to ${companyId}`);
    }
  }

  getCompanies(): MiniCompany[] {
    return Array.from(this.companies.values());
  }

  getActiveCompanies(): MiniCompany[] {
    return this.getCompanies().filter(c => c.active);
  }

  shutdownCompany(id: string): void {
    const company = this.companies.get(id);
    if (!company) return;
    this.companies.set(id, { ...company, active: false });
    this.logger.warn(`Shutdown company: ${id} (${company.name})`);
  }

  getStats() {
    const all = this.getCompanies();
    const active = all.filter(c => c.active);
    const totalRevenue = active.reduce((s, c) => s + c.revenue, 0);
    const totalTraffic = active.reduce((s, c) => s + c.traffic, 0);
    const bySector: Record<string, number> = {};
    for (const c of active) bySector[c.sector] = (bySector[c.sector] ?? 0) + 1;
    return { total: all.length, active: active.length, totalRevenue, totalTraffic, bySector };
  }

  getStatus() {
    return { total: this.companies.size, active: this.getActiveCompanies().length };
  }
}
