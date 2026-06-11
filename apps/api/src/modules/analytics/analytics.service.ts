import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Lead, LeadStatus } from '../../database/entities/lead.entity';
import { Customer, CustomerTier } from '../../database/entities/customer.entity';
import { AgentLog } from '../../database/entities/agent-log.entity';
import { Content, ContentStatus } from '../../database/entities/content.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(AgentLog)
    private readonly agentLogRepo: Repository<AgentLog>,
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
  ) {}

  async getDashboard() {
    const [revenue, leads, customers, ai] = await Promise.all([
      this.getRevenueSummary(),
      this.getLeadSummary(),
      this.getCustomerSummary(),
      this.getAiSummary(),
    ]);

    return { revenue, leads, customers, ai, generatedAt: new Date() };
  }

  async getRevenueSummary() {
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayData, monthData, totalOrders] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('o')
        .select('SUM(o.total)', 'total')
        .addSelect('COUNT(o.id)', 'count')
        .where('o.createdAt >= :today', { today })
        .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
        .getRawOne(),
      this.orderRepo
        .createQueryBuilder('o')
        .select('SUM(o.total)', 'total')
        .addSelect('COUNT(o.id)', 'count')
        .where('o.createdAt >= :thisMonth', { thisMonth })
        .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
        .getRawOne(),
      this.orderRepo.count(),
    ]);

    return {
      today: { revenue: parseFloat(todayData.total || '0'), orders: parseInt(todayData.count || '0') },
      thisMonth: { revenue: parseFloat(monthData.total || '0'), orders: parseInt(monthData.count || '0') },
      totalOrders,
    };
  }

  async getLeadSummary() {
    const n = new Date(); const today = new Date(n.getFullYear(), n.getMonth(), n.getDate());

    const [total, todayNew, converted, byPlatform] = await Promise.all([
      this.leadRepo.count(),
      this.leadRepo.count({ where: {} }),
      this.leadRepo.count({ where: { status: LeadStatus.CONVERTED } }),
      this.leadRepo
        .createQueryBuilder('l')
        .select('l.platform', 'platform')
        .addSelect('COUNT(l.id)', 'count')
        .groupBy('l.platform')
        .getRawMany(),
    ]);

    return {
      total,
      todayNew,
      converted,
      conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) + '%' : '0%',
      byPlatform,
    };
  }

  async getCustomerSummary() {
    const [total, vip, regular] = await Promise.all([
      this.customerRepo.count(),
      this.customerRepo.count({ where: { tier: CustomerTier.VIP } }),
      this.customerRepo.count({ where: { tier: CustomerTier.REGULAR } }),
    ]);

    const topCustomers = await this.customerRepo.find({
      order: { totalSpent: 'DESC' },
      take: 5,
    });

    return { total, vip, regular, topCustomers };
  }

  async getAiSummary() {
    const last30days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const stats = await this.agentLogRepo
      .createQueryBuilder('l')
      .select('l.agent', 'agent')
      .addSelect('COUNT(l.id)', 'runs')
      .addSelect('SUM(l.tokensUsed)', 'tokens')
      .addSelect('SUM(l.cost)', 'cost')
      .addSelect('AVG(l.durationMs)', 'avgDuration')
      .where('l.createdAt >= :since', { since: last30days })
      .groupBy('l.agent')
      .getRawMany();

    const totalTokens = stats.reduce((s, r) => s + parseInt(r.tokens || '0'), 0);
    const totalCost = stats.reduce((s, r) => s + parseFloat(r.cost || '0'), 0);

    return { byAgent: stats, totalTokens, totalCost: totalCost.toFixed(4) };
  }

  async getContentSummary() {
    const [total, published, draft, failed] = await Promise.all([
      this.contentRepo.count(),
      this.contentRepo.count({ where: { status: ContentStatus.PUBLISHED } }),
      this.contentRepo.count({ where: { status: ContentStatus.DRAFT } }),
      this.contentRepo.count({ where: { status: ContentStatus.FAILED } }),
    ]);

    return { total, published, draft, failed };
  }
}
