import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Customer, CustomerTier } from '../../database/entities/customer.entity';
import { Product } from '../../database/entities/product.entity';
import { Lead, LeadStatus } from '../../database/entities/lead.entity';
import { AgentLog, AgentRunStatus } from '../../database/entities/agent-log.entity';
import { Knowledge, KnowledgeDomain, KnowledgeTier, KnowledgeStatus } from '../../database/entities/knowledge.entity';
import { Campaign } from '../../database/entities/campaign.entity';
import { PriceAlert } from '../../database/entities/price-alert.entity';
import { AiService } from '../ai/ai.service';
import { RagService, RagCollection } from '../rag/rag.service';

@Injectable()
export class KnowledgeBrainService {
  private readonly logger = new Logger(KnowledgeBrainService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(AgentLog) private readonly agentLogRepo: Repository<AgentLog>,
    @InjectRepository(Knowledge) private readonly knowledgeRepo: Repository<Knowledge>,
    @InjectRepository(Campaign) private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(PriceAlert) private readonly priceAlertRepo: Repository<PriceAlert>,
    private readonly aiService: AiService,
    private readonly ragService: RagService,
  ) {}

  // ─── DOMAIN 1: Product Intelligence ────────────────────────────────────────

  async getProductIntelligence() {
    const [totalProducts, allProducts] = await Promise.all([
      this.productRepo.count(),
      this.productRepo.find({ take: 200, order: { createdAt: 'DESC' } }),
    ]);

    const topByRevenue = await this.itemRepo
      .createQueryBuilder('i')
      .select('i.productId', 'productId')
      .addSelect('SUM(i.price * i.quantity)', 'revenue')
      .addSelect('SUM(i.quantity)', 'units')
      .groupBy('i.productId')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany();

    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    const topProducts = topByRevenue.map((r) => ({
      id: r.productId,
      name: productMap.get(r.productId)?.name || 'Unknown',
      revenue: parseFloat(r.revenue || '0'),
      units: parseInt(r.units || '0'),
      price: productMap.get(r.productId)?.price || 0,
    }));

    const highMargin = allProducts
      .filter((p) => p.price > 0)
      .sort((a, b) => b.price - a.price)
      .slice(0, 5)
      .map((p) => ({ id: p.id, name: p.name, price: p.price }));

    return {
      domain: KnowledgeDomain.PRODUCT,
      totalProducts,
      topProducts,
      highMarginProducts: highMargin,
      insights: {
        bestSeller: topProducts[0]?.name || null,
        topRevenueContributor: topProducts[0]?.name || null,
        totalSkus: totalProducts,
      },
    };
  }

  // ─── DOMAIN 2: Customer Intelligence ───────────────────────────────────────

  async getCustomerIntelligence() {
    const [total, vip, new30d, active] = await Promise.all([
      this.customerRepo.count(),
      this.customerRepo.count({ where: { tier: CustomerTier.VIP } }),
      this.customerRepo.count({
        where: {
          createdAt: (() => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d as any;
          })(),
        },
      }),
      this.customerRepo.count({ where: { tier: CustomerTier.REGULAR } }),
    ]);

    const highValueCustomers = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.customerId', 'customerId')
      .addSelect('SUM(o.total)', 'totalSpent')
      .addSelect('COUNT(o.id)', 'orderCount')
      .where('o.status != :c', { c: OrderStatus.CANCELLED })
      .groupBy('o.customerId')
      .orderBy('totalSpent', 'DESC')
      .limit(10)
      .getRawMany();

    const customerIds = highValueCustomers.map((r) => r.customerId).filter(Boolean);
    const customers = customerIds.length
      ? await this.customerRepo.findByIds(customerIds)
      : [];
    const cMap = new Map(customers.map((c) => [c.id, c]));

    const topCustomers = highValueCustomers.map((r) => ({
      id: r.customerId,
      name: cMap.get(r.customerId)?.name || 'Unknown',
      totalSpent: parseFloat(r.totalSpent || '0'),
      orderCount: parseInt(r.orderCount || '0'),
    }));

    const repeatBuyers = topCustomers.filter((c) => c.orderCount > 1).length;

    return {
      domain: KnowledgeDomain.CUSTOMER,
      total,
      vip,
      new30d,
      active,
      topCustomers,
      repeatBuyers,
      churnRisk: Math.max(0, total - vip - repeatBuyers),
      insights: {
        highValueCount: vip,
        repeatBuyerCount: repeatBuyers,
        acquisitionRate: total > 0 ? ((new30d / total) * 100).toFixed(1) + '%' : '0%',
      },
    };
  }

  // ─── DOMAIN 3: Business Intelligence ───────────────────────────────────────

  async getBusinessIntelligence() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [revenueThis, revenueLast, totalOrders, convertedLeads, totalLeads] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total),0)', 'rev')
        .where('o.createdAt >= :d', { d: thisMonth })
        .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
        .getRawOne(),
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total),0)', 'rev')
        .where('o.createdAt >= :s AND o.createdAt <= :e', { s: lastMonth, e: lastMonthEnd })
        .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
        .getRawOne(),
      this.orderRepo.count(),
      this.leadRepo.count({ where: { status: LeadStatus.CONVERTED } }),
      this.leadRepo.count(),
    ]);

    const revThis = parseFloat(revenueThis?.rev || '0');
    const revLast = parseFloat(revenueLast?.rev || '0');
    const growth = revLast > 0 ? (((revThis - revLast) / revLast) * 100).toFixed(1) : '0';
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';

    const campaignStats = await this.campaignRepo.count();

    return {
      domain: KnowledgeDomain.BUSINESS,
      revenue: {
        thisMonth: revThis,
        lastMonth: revLast,
        growth: growth + '%',
        trend: parseFloat(growth) >= 0 ? 'up' : 'down',
      },
      orders: { total: totalOrders },
      conversion: {
        rate: conversionRate + '%',
        leads: totalLeads,
        converted: convertedLeads,
      },
      campaigns: campaignStats,
      insights: {
        revenueGrowth: growth + '%',
        mainBottleneck: parseFloat(conversionRate) < 20 ? 'Lead conversion too low' : null,
        growthOpportunity: parseFloat(growth) < 10 ? 'Revenue growth below target' : 'On track',
      },
    };
  }

  // ─── DOMAIN 4: Market Intelligence ─────────────────────────────────────────

  async getMarketIntelligence() {
    const [priceAlerts, totalAlerts] = await Promise.all([
      this.priceAlertRepo.find({ take: 20, order: { createdAt: 'DESC' } }),
      this.priceAlertRepo.count(),
    ]);

    const marketKnowledge = await this.knowledgeRepo.find({
      where: { domain: KnowledgeDomain.MARKET, status: KnowledgeStatus.ACTIVE },
      take: 20,
      order: { updatedAt: 'DESC' },
    });

    const trends = marketKnowledge.map((k) => ({
      id: k.id,
      title: k.title,
      freshness: k.freshness,
      businessValue: k.businessValue,
      updatedAt: k.updatedAt,
    }));

    return {
      domain: KnowledgeDomain.MARKET,
      priceAlerts: totalAlerts,
      recentAlerts: priceAlerts.map((a) => ({
        id: a.id,
        productId: a.productId,
        ourPrice: a.ourPrice,
        competitorPrice: a.competitorPrice,
        platform: a.competitorPlatform,
        diffPercent: a.priceDiffPercent,
        action: a.suggestedAction,
        actedOn: a.isActedOn,
      })),
      trends,
      insights: {
        activePriceMonitoring: totalAlerts,
        trendCount: trends.length,
        marketDataFreshness: trends.length > 0 ? trends[0].freshness + '%' : 'No data',
      },
    };
  }

  // ─── DOMAIN 5: Operational Intelligence ────────────────────────────────────

  async getOperationalIntelligence() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total24h, failed24h, success24h, agentStats] = await Promise.all([
      this.agentLogRepo.count({ where: { createdAt: since24h as any } }),
      this.agentLogRepo.count({ where: { status: AgentRunStatus.FAILED, createdAt: since24h as any } }),
      this.agentLogRepo.count({ where: { status: AgentRunStatus.SUCCESS, createdAt: since24h as any } }),
      this.agentLogRepo
        .createQueryBuilder('l')
        .select('l.agent', 'agent')
        .addSelect('COUNT(*)', 'runs')
        .addSelect('SUM(CASE WHEN l.status = :s THEN 1 ELSE 0 END)', 'failures')
        .addSelect('AVG(l.durationMs)', 'avgMs')
        .setParameter('s', AgentRunStatus.FAILED)
        .groupBy('l.agent')
        .orderBy('runs', 'DESC')
        .getRawMany(),
    ]);

    const successRate = total24h > 0 ? ((success24h / total24h) * 100).toFixed(1) : '100';
    const failingAgents = agentStats
      .filter((a) => parseInt(a.failures || '0') > 0)
      .map((a) => ({ agent: a.agent, failures: parseInt(a.failures), runs: parseInt(a.runs) }));

    return {
      domain: KnowledgeDomain.OPERATIONAL,
      agents24h: {
        total: total24h,
        success: success24h,
        failed: failed24h,
        successRate: successRate + '%',
      },
      agentPerformance: agentStats.map((a) => ({
        agent: a.agent,
        runs: parseInt(a.runs),
        failures: parseInt(a.failures || '0'),
        avgMs: Math.round(parseFloat(a.avgMs || '0')),
      })),
      failingAgents,
      insights: {
        systemHealth: parseFloat(successRate) >= 95 ? 'Healthy' : parseFloat(successRate) >= 80 ? 'Warning' : 'Critical',
        bottleneck: failingAgents[0]?.agent || null,
        successRate: successRate + '%',
      },
    };
  }

  // ─── Executive Questions (8 critical questions) ─────────────────────────────

  async getExecutiveQuestions() {
    const [product, customer, business, operational] = await Promise.all([
      this.getProductIntelligence(),
      this.getCustomerIntelligence(),
      this.getBusinessIntelligence(),
      this.getOperationalIntelligence(),
    ]);

    return [
      {
        id: 1,
        question: 'Sản phẩm nào tốt nhất?',
        answer: product.insights.bestSeller
          ? `${product.insights.bestSeller} — dẫn đầu về doanh thu`
          : 'Chưa có đủ dữ liệu đơn hàng',
        domain: KnowledgeDomain.PRODUCT,
        confidence: product.topProducts.length > 0 ? 90 : 30,
      },
      {
        id: 2,
        question: 'Khách hàng nào giá trị nhất?',
        answer: customer.topCustomers[0]
          ? `${customer.topCustomers[0].name} — chi tiêu ${new Intl.NumberFormat('vi-VN').format(customer.topCustomers[0].totalSpent)}đ`
          : 'Chưa có dữ liệu mua hàng',
        domain: KnowledgeDomain.CUSTOMER,
        confidence: customer.topCustomers.length > 0 ? 85 : 20,
      },
      {
        id: 3,
        question: 'Kênh nào hiệu quả nhất?',
        answer: `Tỷ lệ chuyển đổi Lead → Order: ${business.conversion.rate}`,
        domain: KnowledgeDomain.BUSINESS,
        confidence: business.orders.total > 0 ? 80 : 40,
      },
      {
        id: 4,
        question: 'Chiến dịch nào hiệu quả nhất?',
        answer: `Đang chạy ${business.campaigns} chiến dịch. Cần phân tích ROI chi tiết.`,
        domain: KnowledgeDomain.BUSINESS,
        confidence: 50,
      },
      {
        id: 5,
        question: 'Điều gì đang làm mất tiền?',
        answer: business.insights.mainBottleneck
          ? business.insights.mainBottleneck
          : `Tăng trưởng doanh thu: ${business.revenue.growth}`,
        domain: KnowledgeDomain.BUSINESS,
        confidence: 75,
      },
      {
        id: 6,
        question: 'Điều gì có thể tăng doanh thu nhanh nhất?',
        answer: customer.insights.repeatBuyerCount > 0
          ? `Upsell ${customer.insights.repeatBuyerCount} khách hàng đã mua lại — tiềm năng cao nhất`
          : 'Tăng tỷ lệ chuyển đổi leads hiện tại',
        domain: KnowledgeDomain.CUSTOMER,
        confidence: 70,
      },
      {
        id: 7,
        question: 'Đâu là cơ hội lớn nhất hiện tại?',
        answer: business.insights.growthOpportunity,
        domain: KnowledgeDomain.MARKET,
        confidence: 65,
      },
      {
        id: 8,
        question: 'Đâu là rủi ro lớn nhất hiện tại?',
        answer: operational.insights.systemHealth !== 'Healthy'
          ? `Hệ thống: ${operational.insights.systemHealth} — ${operational.failingAgents.length} agents lỗi`
          : 'Hệ thống ổn định. Theo dõi biến động thị trường.',
        domain: KnowledgeDomain.OPERATIONAL,
        confidence: 85,
      },
    ];
  }

  // ─── Dashboard Overview ─────────────────────────────────────────────────────

  async getDashboard() {
    const [product, customer, business, market, operational] = await Promise.all([
      this.getProductIntelligence(),
      this.getCustomerIntelligence(),
      this.getBusinessIntelligence(),
      this.getMarketIntelligence(),
      this.getOperationalIntelligence(),
    ]);

    const knowledgeStats = await this.getKnowledgeStats();

    return {
      domains: {
        product: { totalProducts: product.totalProducts, topSeller: product.insights.bestSeller },
        customer: { total: customer.total, vip: customer.vip, churnRisk: customer.churnRisk },
        business: { revenue: business.revenue.thisMonth, growth: business.revenue.growth, conversion: business.conversion.rate },
        market: { priceAlerts: market.priceAlerts, trendCount: market.trends.length },
        operational: { health: operational.insights.systemHealth, successRate: operational.agents24h.successRate },
      },
      memoryTiers: {
        shortTerm: knowledgeStats.byTier[KnowledgeTier.SHORT_TERM] || 0,
        mediumTerm: knowledgeStats.byTier[KnowledgeTier.MEDIUM_TERM] || 0,
        longTerm: knowledgeStats.byTier[KnowledgeTier.LONG_TERM] || 0,
      },
      knowledgeStats,
      graph: this.buildRelationshipGraph(business, customer, product),
    };
  }

  // ─── Knowledge Graph ────────────────────────────────────────────────────────

  private buildRelationshipGraph(business: any, customer: any, product: any) {
    return {
      nodes: [
        { id: 'customers', label: 'Khách hàng', count: customer.total, domain: 'customer' },
        { id: 'orders', label: 'Đơn hàng', count: business.orders.total, domain: 'business' },
        { id: 'products', label: 'Sản phẩm', count: product.totalProducts, domain: 'product' },
        { id: 'revenue', label: 'Doanh thu', value: business.revenue.thisMonth, domain: 'business' },
        { id: 'leads', label: 'Leads', count: business.conversion.leads, domain: 'customer' },
        { id: 'market', label: 'Thị trường', domain: 'market' },
      ],
      edges: [
        { from: 'customers', to: 'orders', label: 'tạo ra' },
        { from: 'orders', to: 'products', label: 'chứa' },
        { from: 'orders', to: 'revenue', label: 'sinh ra' },
        { from: 'leads', to: 'customers', label: 'chuyển đổi thành' },
        { from: 'market', to: 'products', label: 'định hình nhu cầu' },
      ],
    };
  }

  // ─── Ingestion Pipeline ─────────────────────────────────────────────────────

  async ingestKnowledge(data: {
    domain: KnowledgeDomain;
    title: string;
    content: string;
    tier?: KnowledgeTier;
    accuracy?: number;
    completeness?: number;
    businessValue?: number;
    tags?: string[];
    sourceId?: string;
  }): Promise<Knowledge> {
    const item = this.knowledgeRepo.create({
      ...data,
      type: this.domainToType(data.domain) as any,
      tier: data.tier || KnowledgeTier.MEDIUM_TERM,
      status: KnowledgeStatus.ACTIVE,
      isIndexed: false,
      freshness: 100,
      accuracy: data.accuracy ?? 100,
      completeness: data.completeness ?? 100,
      businessValue: data.businessValue ?? 50,
    });

    const saved = await this.knowledgeRepo.save(item);

    const collection = this.domainToCollection(data.domain);
    try {
      await this.ragService.upsert(
        collection,
        saved.id,
        `[${data.domain.toUpperCase()}] ${data.title}\n${data.content}`,
        { title: data.title, domain: data.domain, tier: saved.tier, tags: data.tags },
      );
      await this.knowledgeRepo.update(saved.id, { isIndexed: true, indexedAt: new Date() });
    } catch (e) {
      this.logger.warn(`Không thể index vào RAG: ${e.message}`);
    }

    return saved;
  }

  // ─── Ask (RAG-powered) ──────────────────────────────────────────────────────

  async ask(question: string, domains?: KnowledgeDomain[]): Promise<Record<string, any>> {
    const collections = domains
      ? domains.map((d) => this.domainToCollection(d))
      : [RagCollection.PRODUCTS, RagCollection.CUSTOMERS, RagCollection.BUSINESS, RagCollection.MARKET];

    const context = await this.ragService.retrieveContext(question, collections);

    if (!context) {
      return {
        question,
        answer: 'Knowledge Brain chưa có đủ dữ liệu để trả lời câu hỏi này. Hãy nạp thêm tri thức.',
        confidence: 0,
        sources: [],
      };
    }

    const answer = await this.aiService.generate(
      `Câu hỏi: "${question}"\n\nTri thức nội bộ:\n${context}\n\nHãy trả lời ngắn gọn, chính xác, dựa trên dữ liệu thực tế của doanh nghiệp.`,
      'Bạn là Knowledge Brain của AI Commerce OS — nguồn tri thức trung tâm. Trả lời bằng tiếng Việt, dựa trên dữ liệu thực.',
    );

    return { question, answer, confidence: 80, hasContext: true };
  }

  // ─── Quality Score ───────────────────────────────────────────────────────────

  async getKnowledgeStats() {
    const total = await this.knowledgeRepo.count();
    const indexed = await this.knowledgeRepo.count({ where: { isIndexed: true } });

    const byDomain = await this.knowledgeRepo
      .createQueryBuilder('k')
      .select('k.domain', 'domain')
      .addSelect('COUNT(*)', 'count')
      .groupBy('k.domain')
      .getRawMany();

    const byTierRaw = await this.knowledgeRepo
      .createQueryBuilder('k')
      .select('k.tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .groupBy('k.tier')
      .getRawMany();

    const byTier: Record<string, number> = {};
    for (const r of byTierRaw) {
      byTier[r.tier] = parseInt(r.count);
    }

    const avgScores = await this.knowledgeRepo
      .createQueryBuilder('k')
      .select('AVG(k.accuracy)', 'accuracy')
      .addSelect('AVG(k.completeness)', 'completeness')
      .addSelect('AVG(k.freshness)', 'freshness')
      .addSelect('AVG(k.businessValue)', 'businessValue')
      .getRawOne();

    return {
      total,
      indexed,
      coverage: total > 0 ? ((indexed / total) * 100).toFixed(1) + '%' : '0%',
      byDomain: byDomain.map((r) => ({ domain: r.domain, count: parseInt(r.count) })),
      byTier,
      quality: {
        accuracy: Math.round(parseFloat(avgScores?.accuracy || '0')),
        completeness: Math.round(parseFloat(avgScores?.completeness || '0')),
        freshness: Math.round(parseFloat(avgScores?.freshness || '0')),
        businessValue: Math.round(parseFloat(avgScores?.businessValue || '0')),
      },
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private domainToCollection(domain: KnowledgeDomain): RagCollection {
    const map: Record<KnowledgeDomain, RagCollection> = {
      [KnowledgeDomain.PRODUCT]: RagCollection.PRODUCTS,
      [KnowledgeDomain.CUSTOMER]: RagCollection.CUSTOMERS,
      [KnowledgeDomain.BUSINESS]: RagCollection.BUSINESS,
      [KnowledgeDomain.MARKET]: RagCollection.MARKET,
      [KnowledgeDomain.OPERATIONAL]: RagCollection.OPERATIONAL,
    };
    return map[domain] || RagCollection.FAQ;
  }

  private domainToType(domain: KnowledgeDomain): string {
    const map: Record<KnowledgeDomain, string> = {
      [KnowledgeDomain.PRODUCT]: 'product',
      [KnowledgeDomain.CUSTOMER]: 'customer',
      [KnowledgeDomain.BUSINESS]: 'training',
      [KnowledgeDomain.MARKET]: 'marketing',
      [KnowledgeDomain.OPERATIONAL]: 'training',
    };
    return map[domain] || 'training';
  }
}
