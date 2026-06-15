import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Lead } from '../../database/entities/lead.entity';
import { RevenueSnapshot, SnapshotPeriod } from '../../database/entities/revenue-snapshot.entity';

export interface KpiReport {
  period: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  newCustomers: number;
  conversionRate: number;
  growthVsPrevious: number;
  grossMarginPercent: number;
}

export interface Forecast {
  nextPeriod: string;
  predictedRevenue: number;
  predictedOrders: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  trendDirection: 'up' | 'flat' | 'down';
  basis: string;
}

@Injectable()
export class RevenueAnalyticsService {
  private readonly logger = new Logger(RevenueAnalyticsService.name);

  constructor(
    @InjectRepository(Order)           private readonly orderRepo: Repository<Order>,
    @InjectRepository(Customer)        private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Lead)            private readonly leadRepo: Repository<Lead>,
    @InjectRepository(RevenueSnapshot) private readonly snapshotRepo: Repository<RevenueSnapshot>,
  ) {}

  // ─── F01: KPI Tracking ───────────────────────────────────────────────────

  async getKpis(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<KpiReport> {
    const now = new Date();
    let startDate: Date;
    let prevStart: Date;
    let periodLabel: string;

    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStart = new Date(startDate.getTime() - 86400000);
      periodLabel = startDate.toISOString().slice(0, 10);
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay() || 7;
      startDate = new Date(now.getTime() - (dayOfWeek - 1) * 86400000);
      startDate.setHours(0, 0, 0, 0);
      prevStart = new Date(startDate.getTime() - 7 * 86400000);
      periodLabel = `Week of ${startDate.toISOString().slice(0, 10)}`;
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const [current, previous, newCustomers, totalLeads] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('o')
        .select('SUM(o.total)', 'revenue')
        .addSelect('COUNT(o.id)', 'orders')
        .where('o.createdAt >= :s', { s: startDate })
        .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
        .getRawOne(),
      this.orderRepo
        .createQueryBuilder('o')
        .select('SUM(o.total)', 'revenue')
        .addSelect('COUNT(o.id)', 'orders')
        .where('o.createdAt >= :s AND o.createdAt < :e', { s: prevStart, e: startDate })
        .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
        .getRawOne(),
      this.customerRepo
        .createQueryBuilder('c')
        .where('c.createdAt >= :s', { s: startDate })
        .getCount(),
      this.leadRepo
        .createQueryBuilder('l')
        .where('l.createdAt >= :s', { s: startDate })
        .getCount(),
    ]);

    const revenue     = parseFloat(current?.revenue || '0');
    const orders      = parseInt(current?.orders || '0');
    const prevRevenue = parseFloat(previous?.revenue || '0');
    const avgOrderValue = orders > 0 ? revenue / orders : 0;
    const conversionRate = totalLeads > 0 ? (orders / totalLeads) * 100 : 0;
    const growthVsPrevious = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    return {
      period: periodLabel,
      revenue: Math.round(revenue),
      orders,
      avgOrderValue: Math.round(avgOrderValue),
      newCustomers,
      conversionRate: Math.round(conversionRate * 10) / 10,
      growthVsPrevious: Math.round(growthVsPrevious * 10) / 10,
      grossMarginPercent: 35, // Would be calculated from product costs
    };
  }

  // ─── F01: Forecasting ────────────────────────────────────────────────────

  async forecast(period: 'weekly' | 'monthly' = 'monthly'): Promise<Forecast> {
    // Gather last 3 snapshots for trend analysis
    const snapshots = await this.snapshotRepo.find({
      where: { period: period === 'monthly' ? SnapshotPeriod.MONTHLY : SnapshotPeriod.WEEKLY },
      order: { snapshotDate: 'DESC' },
      take: 3,
    });

    if (snapshots.length < 2) {
      // Fallback: use current KPIs to forecast
      const current = await this.getKpis(period === 'monthly' ? 'monthly' : 'weekly');
      return {
        nextPeriod: period,
        predictedRevenue: Math.round(current.revenue * 1.1),
        predictedOrders: Math.round(current.orders * 1.1),
        confidenceLevel: 'low',
        trendDirection: 'up',
        basis: 'Dự báo tăng 10% dựa trên dữ liệu hiện tại (không đủ lịch sử)',
      };
    }

    const revenues = snapshots.map((s) => Number(s.totalRevenue));
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;

    // Simple linear trend: compare most recent vs older
    const recentAvg = (revenues[0] + revenues[1]) / 2;
    const olderAvg = revenues[revenues.length - 1];
    const trendRate = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;

    const trendDirection: Forecast['trendDirection'] =
      trendRate > 0.02 ? 'up' : trendRate < -0.02 ? 'down' : 'flat';

    const predictedRevenue = Math.round(recentAvg * (1 + trendRate));
    const avgOrders = snapshots.reduce((s, snap) => s + snap.totalOrders, 0) / snapshots.length;

    const now = new Date();
    const nextPeriodLabel = period === 'monthly'
      ? `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}`
      : `Week of next ${period}`;

    return {
      nextPeriod: nextPeriodLabel,
      predictedRevenue,
      predictedOrders: Math.round(avgOrders * (1 + trendRate)),
      confidenceLevel: snapshots.length >= 3 ? 'medium' : 'low',
      trendDirection,
      basis: `Phân tích ${snapshots.length} kỳ gần nhất, xu hướng ${trendDirection === 'up' ? 'tăng' : trendDirection === 'down' ? 'giảm' : 'ổn định'} ${Math.abs(trendRate * 100).toFixed(1)}%/kỳ`,
    };
  }

  // ─── Snapshot creation (called by cron in executive-reports.service) ──────

  async createDailySnapshot(): Promise<RevenueSnapshot> {
    const kpis = await this.getKpis('daily');
    const today = new Date(new Date().toISOString().slice(0, 10));

    const existing = await this.snapshotRepo.findOne({
      where: { period: SnapshotPeriod.DAILY, snapshotDate: today },
    });

    const data = {
      period: SnapshotPeriod.DAILY,
      snapshotDate: today,
      totalRevenue: kpis.revenue,
      totalCost: Math.round(kpis.revenue * 0.65),
      grossProfit: Math.round(kpis.revenue * 0.35),
      grossMarginPercent: 35,
      totalOrders: kpis.orders,
      totalNewCustomers: kpis.newCustomers,
      avgOrderValue: kpis.avgOrderValue,
      conversionRate: kpis.conversionRate,
      affiliateRevenue: 0,
      dropshipRevenue: 0,
    };

    if (existing) {
      await this.snapshotRepo.update(existing.id, data);
      return this.snapshotRepo.findOneByOrFail({ id: existing.id });
    }
    return this.snapshotRepo.save(this.snapshotRepo.create(data));
  }

  async getSnapshotHistory(period: SnapshotPeriod, limit = 30): Promise<RevenueSnapshot[]> {
    return this.snapshotRepo.find({
      where: { period },
      order: { snapshotDate: 'DESC' },
      take: limit,
    });
  }
}
