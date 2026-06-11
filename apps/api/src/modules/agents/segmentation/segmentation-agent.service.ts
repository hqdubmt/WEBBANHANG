import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../../ai/ai.service';
import { Customer } from '../../../database/entities/customer.entity';
import { Order } from '../../../database/entities/order.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';

export enum CustomerSegment {
  NEW = 'new',
  RETURNING = 'returning',
  VIP = 'vip',
  POTENTIAL = 'potential',
  INACTIVE = 'inactive',
}

interface SegmentResult {
  customerId: string;
  segment: CustomerSegment;
  score: number;
  reason: string;
}

@Injectable()
export class SegmentationAgentService {
  private readonly logger = new Logger(SegmentationAgentService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 2 * * *')
  async runDailySegmentation() {
    this.logger.log('Segmentation Agent: phân loại khách hàng...');
    await this.segmentAllCustomers();
  }

  async segmentAllCustomers(): Promise<SegmentResult[]> {
    const log = this.logRepo.create({ agent: AgentName.SEGMENTATION, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const customers = await this.customerRepo.find({ take: 500, order: { createdAt: 'DESC' } });
      const results: SegmentResult[] = [];

      for (const customer of customers) {
        const orders = await this.orderRepo.find({ where: { customerId: customer.id } });
        const segment = this.classify(customer, orders);
        results.push(segment);
      }

      const summary = results.reduce<Record<string, number>>((acc, r) => {
        acc[r.segment] = (acc[r.segment] || 0) + 1;
        return acc;
      }, {});

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { total: results.length, summary } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Segmentation Agent: phân loại ${results.length} khách. VIP: ${summary.vip || 0}`);
      return results;
    } catch (e) {
      this.logger.error('Segmentation Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  private classify(customer: Customer, orders: Order[]): SegmentResult {
    const orderCount = orders.length;
    const totalSpend = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const daysSinceJoin = (Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const lastOrder = orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const daysSinceOrder = lastOrder
      ? (Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    let segment: CustomerSegment;
    let score = 0;
    let reason: string;

    if (orderCount === 0 && daysSinceJoin <= 7) {
      segment = CustomerSegment.NEW;
      score = 30;
      reason = 'Khách mới đăng ký trong 7 ngày, chưa có đơn';
    } else if (orderCount === 0) {
      segment = CustomerSegment.POTENTIAL;
      score = 20;
      reason = 'Chưa mua hàng, cần nurturing';
    } else if (totalSpend >= 5000000 || orderCount >= 10) {
      segment = CustomerSegment.VIP;
      score = 100;
      reason = `VIP: ${orderCount} đơn, chi ${totalSpend.toLocaleString('vi-VN')}đ`;
    } else if (daysSinceOrder > 90) {
      segment = CustomerSegment.INACTIVE;
      score = 10;
      reason = `Không hoạt động ${Math.round(daysSinceOrder)} ngày`;
    } else {
      segment = CustomerSegment.RETURNING;
      score = 60 + Math.min(orderCount * 5, 30);
      reason = `Khách quay lại: ${orderCount} đơn`;
    }

    return { customerId: customer.id, segment, score, reason };
  }

  async getSegmentStats(): Promise<Record<string, number>> {
    const customers = await this.customerRepo.find();
    const orders = await this.orderRepo.find();
    const ordersByCustomer = orders.reduce<Record<string, Order[]>>((acc, o) => {
      acc[o.customerId] = acc[o.customerId] || [];
      acc[o.customerId].push(o);
      return acc;
    }, {});

    const stats: Record<string, number> = {};
    Object.values(CustomerSegment).forEach((s) => (stats[s] = 0));

    for (const c of customers) {
      const seg = this.classify(c, ordersByCustomer[c.id] || []).segment;
      stats[seg] = (stats[seg] || 0) + 1;
    }

    return stats;
  }
}
