import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { Customer, CustomerTier } from '../../../database/entities/customer.entity';
import { Order } from '../../../database/entities/order.entity';
import { Lead, LeadStatus } from '../../../database/entities/lead.entity';
import { AiService } from '../../ai/ai.service';

export interface CrmAction {
  type: 'upgrade_tier' | 'retention_alert' | 'reactivation' | 'upsell';
  customerId: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

@Injectable()
export class CrmAgentService {
  private readonly logger = new Logger(CrmAgentService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
  ) {}

  @Cron('0 2 * * *')
  async runDailyCrm() {
    this.logger.log('CRM Agent: phân tích khách hàng...');
    await this.analyzeCrm();
  }

  async analyzeCrm(): Promise<CrmAction[]> {
    const log = this.logRepo.create({ agent: AgentName.CRM, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const actions: CrmAction[] = [];

      const [tierActions, retentionActions, leadActions] = await Promise.all([
        this.updateCustomerTiers(),
        this.detectChurnRisk(),
        this.convertQualifiedLeads(),
      ]);

      actions.push(...tierActions, ...retentionActions, ...leadActions);

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: {
          totalActions: actions.length,
          tierUpdates: tierActions.length,
          retentionAlerts: retentionActions.length,
          leadConversions: leadActions.length,
        } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`CRM Agent xong: ${actions.length} hành động`);
      return actions;
    } catch (e) {
      this.logger.error('CRM Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  private async updateCustomerTiers(): Promise<CrmAction[]> {
    const customers = await this.customerRepo.find();
    const actions: CrmAction[] = [];

    for (const customer of customers) {
      let newTier: CustomerTier;

      if (customer.totalSpent >= 10_000_000 || customer.totalOrders >= 20) {
        newTier = CustomerTier.VIP;
      } else if (customer.totalSpent >= 2_000_000 || customer.totalOrders >= 5) {
        newTier = CustomerTier.REGULAR;
      } else {
        newTier = CustomerTier.NEW;
      }

      if (newTier !== customer.tier) {
        await this.customerRepo.update(customer.id, { tier: newTier });
        actions.push({
          type: 'upgrade_tier',
          customerId: customer.id,
          reason: `Nâng tier từ ${customer.tier} → ${newTier} (${customer.totalOrders} đơn, ${customer.totalSpent.toLocaleString('vi-VN')}đ)`,
          priority: newTier === CustomerTier.VIP ? 'high' : 'medium',
        });
      }
    }

    return actions;
  }

  private async detectChurnRisk(): Promise<CrmAction[]> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const actions: CrmAction[] = [];

    const atRiskCustomers = await this.customerRepo
      .createQueryBuilder('c')
      .where('c.totalOrders > 0')
      .andWhere('c.updatedAt < :cutoff', { cutoff })
      .andWhere('c.tier != :tier', { tier: CustomerTier.NEW })
      .getMany();

    for (const customer of atRiskCustomers) {
      actions.push({
        type: 'retention_alert',
        customerId: customer.id,
        reason: `Khách hàng ${customer.tier} không hoạt động >30 ngày`,
        priority: customer.tier === CustomerTier.VIP ? 'high' : 'medium',
      });
    }

    return actions;
  }

  private async convertQualifiedLeads(): Promise<CrmAction[]> {
    const qualifiedLeads = await this.leadRepo.find({
      where: { status: LeadStatus.QUALIFIED },
      take: 50,
    });

    const actions: CrmAction[] = [];

    for (const lead of qualifiedLeads) {
      if (lead.customerId) {
        actions.push({
          type: 'upsell',
          customerId: lead.customerId,
          reason: `Lead đã qualified: ${lead.intent || 'mua hàng'} - score ${lead.score}`,
          priority: Number(lead.score) >= 80 ? 'high' : 'medium',
        });
      }
    }

    return actions;
  }

  async getCustomerProfile(customerId: string): Promise<Record<string, any>> {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) return {};

    const orders = await this.orderRepo.find({ where: { customerId }, order: { createdAt: 'DESC' }, take: 10 });
    const leads = await this.leadRepo.find({ where: { customerId } });

    const prompt = `Phân tích hồ sơ khách hàng:
Tên: ${customer.name}, Tier: ${customer.tier}
Tổng đơn: ${customer.totalOrders}, Tổng chi tiêu: ${customer.totalSpent.toLocaleString('vi-VN')}đ
Số đơn gần nhất: ${orders.length}

Viết 2-3 câu nhận xét về khách hàng và gợi ý chiến lược bán hàng phù hợp.`;

    const analysis = await this.aiService.generate(prompt).catch(() => 'Không thể phân tích lúc này.');

    return {
      customer,
      recentOrders: orders,
      leads,
      analysis,
      ltv: customer.totalSpent,
      avgOrderValue: customer.totalOrders ? Number(customer.totalSpent) / customer.totalOrders : 0,
    };
  }

  async getCrmStats(): Promise<Record<string, any>> {
    const [total, vip, regular, newCustomers] = await Promise.all([
      this.customerRepo.count(),
      this.customerRepo.count({ where: { tier: CustomerTier.VIP } }),
      this.customerRepo.count({ where: { tier: CustomerTier.REGULAR } }),
      this.customerRepo.count({ where: { tier: CustomerTier.NEW } }),
    ]);

    const totalRevenue = await this.customerRepo
      .createQueryBuilder('c')
      .select('SUM(c.totalSpent)', 'sum')
      .getRawOne();

    return {
      totalCustomers: total,
      vip,
      regular,
      new: newCustomers,
      totalRevenue: Number(totalRevenue?.sum || 0),
      avgLtv: total ? Number(totalRevenue?.sum || 0) / total : 0,
    };
  }
}
