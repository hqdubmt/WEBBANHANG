import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Lead, LeadStatus } from '../../database/entities/lead.entity';
import { Customer } from '../../database/entities/customer.entity';
import { AiService } from '../ai/ai.service';
import { KnowledgeBrainService } from '../knowledge-brain/knowledge-brain.service';
import { DbDiscoveryService } from '../knowledge-brain/db-discovery.service';
import { KnowledgeDomain } from '../../database/entities/knowledge.entity';

type QueryIntent = 'kpi' | 'database' | 'business' | 'general';

@Injectable()
export class AdminAssistantService {
  constructor(
    @InjectRepository(Order)  private readonly orderRepo: Repository<Order>,
    @InjectRepository(Lead)   private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    private readonly aiService: AiService,
    private readonly knowledgeBrain: KnowledgeBrainService,
    private readonly dbDiscovery: DbDiscoveryService,
  ) {}

  // ─── KPI Snapshot ────────────────────────────────────────────────────────

  async getKpiSnapshot() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [revenueMonth, revenueToday, totalOrders, openLeads, totalCustomers] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total),0)', 'v')
        .where('o.createdAt >= :d', { d: monthStart })
        .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
        .getRawOne(),
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total),0)', 'v')
        .where('o.createdAt >= :d', { d: todayStart })
        .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
        .getRawOne(),
      this.orderRepo.count(),
      this.leadRepo.count({ where: { status: LeadStatus.NEW } }),
      this.customerRepo.count(),
    ]);

    return {
      revenue: {
        today: parseFloat(revenueToday?.v ?? '0'),
        thisMonth: parseFloat(revenueMonth?.v ?? '0'),
      },
      orders: { total: totalOrders },
      leads: { open: openLeads },
      customers: { total: totalCustomers },
      generatedAt: new Date(),
    };
  }

  // ─── Intent Detection ────────────────────────────────────────────────────

  private detectIntent(question: string): QueryIntent {
    const q = question.toLowerCase();
    if (/kpi|doanh thu|revenue|đơn hàng|khách hàng|lead|tăng trưởng|tháng/.test(q)) return 'kpi';
    if (/bảng|table|schema|cột|column|quan hệ|relation|database|db/.test(q)) return 'database';
    if (/sản phẩm|chiến dịch|hiệu quả|tốt nhất|bán chạy|phân tích/.test(q)) return 'business';
    return 'general';
  }

  // ─── Query Router ────────────────────────────────────────────────────────

  async query(question: string): Promise<{
    question: string;
    intent: QueryIntent;
    data: unknown;
    answer: string;
  }> {
    const intent = this.detectIntent(question);

    let data: unknown;
    let contextStr = '';

    switch (intent) {
      case 'kpi': {
        data = await this.getKpiSnapshot();
        contextStr = `KPI hiện tại: ${JSON.stringify(data, null, 2)}`;
        break;
      }
      case 'database': {
        data = await this.dbDiscovery.getMetadataRegistry();
        const meta = data as any;
        contextStr = `Database có ${meta.totalTables} bảng, ${meta.totalRelationships} quan hệ. Danh sách: ${meta.registry.map((r: any) => r.table).join(', ')}`;
        break;
      }
      case 'business': {
        const brainData = await this.knowledgeBrain.ask(question, [
          KnowledgeDomain.PRODUCT,
          KnowledgeDomain.BUSINESS,
          KnowledgeDomain.CUSTOMER,
        ]);
        return { question, intent, data: brainData, answer: brainData.answer as string };
      }
      default: {
        data = null;
        contextStr = '';
      }
    }

    const answer = await this.aiService.generate(
      `Câu hỏi: "${question}"\n\n${contextStr}\n\nHãy trả lời ngắn gọn bằng tiếng Việt.`,
      'Bạn là Admin Assistant của AI Commerce OS. Chỉ trả lời dựa trên dữ liệu được cung cấp.',
    );

    return { question, intent, data, answer };
  }
}
