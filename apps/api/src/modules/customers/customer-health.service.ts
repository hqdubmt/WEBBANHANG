import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, CustomerTier } from '../../database/entities/customer.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';

export interface HealthScore {
  customerId: string;
  customerName: string;
  rfm: { recency: number; frequency: number; monetary: number };
  healthScore: number;
  churnRisk: number;
  segment: 'champion' | 'loyal' | 'at_risk' | 'lost' | 'new';
}

@Injectable()
export class CustomerHealthService {
  private readonly logger = new Logger(CustomerHealthService.name);

  constructor(
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Order)    private readonly orderRepo: Repository<Order>,
  ) {}

  // ─── F01: Health Score (RFM) ─────────────────────────────────────────────

  async calculateHealthScore(customerId: string): Promise<HealthScore> {
    const customer = await this.customerRepo.findOneByOrFail({ id: customerId });

    const orders = await this.orderRepo.find({
      where: { customerId, status: OrderStatus.DELIVERED },
      order: { createdAt: 'DESC' },
    });

    const now = Date.now();

    // Recency: days since last order (0 = today, 100 = 365+ days ago → inverted)
    const lastOrderDate = orders[0]?.createdAt;
    const daysSinceLast = lastOrderDate
      ? Math.floor((now - lastOrderDate.getTime()) / 86400000)
      : 999;
    const recency = Math.max(0, 100 - Math.min(daysSinceLast, 100));

    // Frequency: number of orders (capped at 20 → 100)
    const frequency = Math.min(100, (orders.length / 20) * 100);

    // Monetary: total spent (capped at 50M VND → 100)
    const monetary = Math.min(100, (customer.totalSpent / 50_000_000) * 100);

    const healthScore = Math.round(recency * 0.35 + frequency * 0.30 + monetary * 0.35);
    const churnRisk   = Math.max(0, 100 - healthScore);
    const segment     = this.classifySegment(recency, frequency, monetary);

    // Persist to DB
    await this.customerRepo.update(customerId, { churnRisk, ltv: customer.totalSpent });

    return {
      customerId,
      customerName: customer.name,
      rfm: {
        recency:   Math.round(recency),
        frequency: Math.round(frequency),
        monetary:  Math.round(monetary),
      },
      healthScore,
      churnRisk,
      segment,
    };
  }

  private classifySegment(r: number, f: number, m: number): HealthScore['segment'] {
    const avg = (r + f + m) / 3;
    if (avg >= 75 && r >= 70)  return 'champion';
    if (avg >= 60)              return 'loyal';
    if (r < 30 && avg < 50)    return 'lost';
    if (r < 50)                 return 'at_risk';
    return 'new';
  }

  // ─── F01: Batch health scan ───────────────────────────────────────────────

  async batchUpdateHealthScores(limit = 100): Promise<{ processed: number }> {
    const customers = await this.customerRepo.find({
      order: { updatedAt: 'ASC' },
      take: limit,
    });

    let processed = 0;
    for (const c of customers) {
      try { await this.calculateHealthScore(c.id); processed++; }
      catch { /* skip */ }
    }
    return { processed };
  }

  // ─── F01: Risk Detection ─────────────────────────────────────────────────

  async detectAtRisk(thresholdRisk = 60): Promise<Customer[]> {
    return this.customerRepo
      .createQueryBuilder('c')
      .where('c.churnRisk >= :t', { t: thresholdRisk })
      .andWhere('c.tier != :tier', { tier: CustomerTier.NEW })
      .orderBy('c.churnRisk', 'DESC')
      .take(50)
      .getMany();
  }

  async getHealthDashboard() {
    const [total, vip, atRisk, champion] = await Promise.all([
      this.customerRepo.count(),
      this.customerRepo.count({ where: { tier: CustomerTier.VIP } }),
      this.customerRepo.createQueryBuilder('c').where('c.churnRisk >= 60').getCount(),
      this.customerRepo.createQueryBuilder('c').where('c.churnRisk <= 20').andWhere('c.totalOrders >= 3').getCount(),
    ]);

    const avgLtv = await this.customerRepo
      .createQueryBuilder('c').select('AVG(c.ltv)', 'avg').getRawOne();

    return {
      total, vip, atRisk, champion,
      avgLtv: Math.round(parseFloat(avgLtv?.avg ?? '0')),
      healthRate: total > 0 ? (((total - atRisk) / total) * 100).toFixed(1) + '%' : '100%',
    };
  }
}
