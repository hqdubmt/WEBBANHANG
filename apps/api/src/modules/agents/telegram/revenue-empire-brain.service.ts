import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

export interface Sector {
  id: string;
  name: string;
  revenue: number;
  traffic: number;
  efficiency: number;
  status: 'growing' | 'stable' | 'declining';
}

@Injectable()
export class RevenueEmpireBrainService {
  private readonly logger = new Logger(RevenueEmpireBrainService.name);

  sectors: Map<string, Sector> = new Map([
    ['affiliate', { id: 'affiliate', name: 'Affiliate Engine', revenue: 5000, traffic: 12000, efficiency: 0.85, status: 'growing' }],
    ['content', { id: 'content', name: 'Content Commerce', revenue: 3000, traffic: 8000, efficiency: 0.72, status: 'stable' }],
    ['ads', { id: 'ads', name: 'Ad Revenue', revenue: 2500, traffic: 20000, efficiency: 0.60, status: 'declining' }],
    ['flashdeal', { id: 'flashdeal', name: 'Flash Deals', revenue: 7000, traffic: 15000, efficiency: 0.90, status: 'growing' }],
  ]);

  observeEconomy(): { totalRevenue: number; topSector: string; weakSector: string } {
    let totalRevenue = 0;
    let topSector = '';
    let weakSector = '';
    let topRev = -Infinity;
    let weakRev = Infinity;

    for (const [id, s] of this.sectors) {
      totalRevenue += s.revenue;
      if (s.revenue > topRev) { topRev = s.revenue; topSector = id; }
      if (s.revenue < weakRev) { weakRev = s.revenue; weakSector = id; }
    }

    return { totalRevenue, topSector, weakSector };
  }

  analyzeSector(id: string): Sector | undefined {
    const sector = this.sectors.get(id);
    if (!sector) return undefined;
    const revenuePerTraffic = sector.traffic > 0 ? sector.revenue / sector.traffic : 0;
    let status: Sector['status'] = 'stable';
    if (revenuePerTraffic > 0.4 && sector.efficiency > 0.8) status = 'growing';
    else if (revenuePerTraffic < 0.2 || sector.efficiency < 0.65) status = 'declining';
    this.sectors.set(id, { ...sector, status });
    return this.sectors.get(id);
  }

  @Cron('0 3 * * *')
  empireLoop(): void {
    this.logger.log('[Empire] Running daily empire analysis');
    const economy = this.observeEconomy();
    this.logger.log(`[Empire] Total revenue: ${economy.totalRevenue} | Top: ${economy.topSector} | Weak: ${economy.weakSector}`);
    for (const [id] of this.sectors) {
      this.analyzeSector(id);
    }
  }

  getStats() {
    const economy = this.observeEconomy();
    const sectorList = Array.from(this.sectors.values());
    return {
      totalSectors: sectorList.length,
      totalRevenue: economy.totalRevenue,
      topSector: economy.topSector,
      weakSector: economy.weakSector,
      growing: sectorList.filter(s => s.status === 'growing').length,
      declining: sectorList.filter(s => s.status === 'declining').length,
    };
  }

  getStatus() {
    return { sectors: this.sectors.size };
  }
}
