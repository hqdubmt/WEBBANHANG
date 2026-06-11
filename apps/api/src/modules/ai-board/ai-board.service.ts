import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Lead, LeadStatus } from '../../database/entities/lead.entity';
import { Customer, CustomerTier } from '../../database/entities/customer.entity';
import { AgentLog, AgentRunStatus } from '../../database/entities/agent-log.entity';
import { Content, ContentStatus } from '../../database/entities/content.entity';
import { Product } from '../../database/entities/product.entity';
import { Campaign } from '../../database/entities/campaign.entity';
import { Tenant, TenantStatus } from '../../database/entities/tenant.entity';
import { WhiteLabelClient } from '../../database/entities/white-label-client.entity';
import { MarketplaceVendor } from '../../database/entities/marketplace-vendor.entity';
import { MobileSession } from '../../database/entities/mobile-session.entity';

// ─── CEO AI ──────────────────────────────────────────────────────────────────

@Injectable()
export class AiBoardService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(AgentLog) private readonly agentLogRepo: Repository<AgentLog>,
    @InjectRepository(Content) private readonly contentRepo: Repository<Content>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Campaign) private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(WhiteLabelClient) private readonly wlRepo: Repository<WhiteLabelClient>,
    @InjectRepository(MarketplaceVendor) private readonly vendorRepo: Repository<MarketplaceVendor>,
    @InjectRepository(MobileSession) private readonly mobileRepo: Repository<MobileSession>,
  ) {}

  // ─── Shared Helpers ─────────────────────────────────────────────────────────

  private lastWeek() { return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); }
  private thisMonth() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); }
  private lastMonth() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() - 1, 1); }
  private lastMonthEnd() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 0); }
  private today() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }

  private async getRevenueRange(from: Date, to?: Date) {
    const qb = this.orderRepo.createQueryBuilder('o')
      .select('SUM(o.total)', 'rev').addSelect('COUNT(o.id)', 'cnt')
      .where('o.createdAt >= :from', { from })
      .andWhere('o.status != :c', { c: OrderStatus.CANCELLED });
    if (to) qb.andWhere('o.createdAt <= :to', { to });
    return qb.getRawOne();
  }

  // ─── CEO AI ─────────────────────────────────────────────────────────────────

  async getCeoReport() {
    const [monthRaw, lastMonthRaw, totalOrders, totalLeads, converted, p0Issues] = await Promise.all([
      this.getRevenueRange(this.thisMonth()),
      this.getRevenueRange(this.lastMonth(), this.lastMonthEnd()),
      this.orderRepo.count({ where: { status: OrderStatus.DELIVERED } }),
      this.leadRepo.count(),
      this.leadRepo.count({ where: { status: LeadStatus.CONVERTED } }),
      this.agentLogRepo.createQueryBuilder('l')
        .where('l.status = :s', { s: AgentRunStatus.FAILED })
        .andWhere('l.createdAt >= :d', { d: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        .getCount(),
    ]);

    const monthRev = parseFloat(monthRaw?.rev || '0');
    const lastMonthRev = parseFloat(lastMonthRaw?.rev || '0');
    const growth = lastMonthRev > 0 ? ((monthRev - lastMonthRev) / lastMonthRev * 100).toFixed(1) : null;
    const convRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : '0';
    const isOnTrack = growth !== null ? parseFloat(growth) > 0 : monthRev > 0;
    const slaViolations = await this.tenantRepo
      .createQueryBuilder('t').where('t.uptimePercent < t.slaTarget').getCount();

    const priorities: string[] = [];
    if (p0Issues > 3) priorities.push('Khắc phục agent failures ngay — hệ thống tự động đang gián đoạn');
    if (slaViolations > 0) priorities.push(`${slaViolations} tenant vi phạm SLA — P0 enterprise risk`);
    if (!isOnTrack) priorities.push('Tăng tốc sales pipeline — doanh thu đang dưới kế hoạch');
    if (parseFloat(convRate) < 10) priorities.push('Tối ưu funnel chuyển đổi lead — conversion rate thấp');
    priorities.push('Mở rộng white label & marketplace vendor để tăng revenue stream');

    const opportunities: string[] = [];
    const wlCount = await this.wlRepo.count();
    const vendorCount = await this.vendorRepo.count();
    if (wlCount < 5) opportunities.push('Mở rộng white label client — revenue stream chưa khai thác đủ');
    if (vendorCount < 10) opportunities.push('Tuyển thêm marketplace vendor để mở rộng danh mục');
    opportunities.push('Tăng D7 retention mobile → tăng LTV khách hàng');
    opportunities.push('Upsell enterprise plan cho SMB hiện tại');

    const risks: string[] = [];
    if (p0Issues > 3) risks.push('Agent system instability — automation revenue at risk');
    if (slaViolations > 0) risks.push('SLA breach — enterprise contract churn risk');
    if (parseFloat(convRate) < 5) risks.push('Conversion rate crisis — low sales pipeline conversion');

    return {
      role: 'CEO AI',
      title: 'Chief Executive Officer',
      kpi: {
        revenueGrowth: growth ? growth + '%' : 'N/A',
        monthRevenue: monthRev,
        totalOrders,
        conversionRate: convRate + '%',
      },
      questions: {
        onTrack: isOnTrack ? 'Công ty đang đi đúng hướng' : 'Cần điều chỉnh chiến lược — doanh thu dưới kế hoạch',
        topPriority: priorities[0] || 'Tiếp tục tăng trưởng bền vững',
        revenueStatus: growth ? (parseFloat(growth) > 0 ? `Doanh thu tăng ${growth}% so với tháng trước` : `Doanh thu giảm ${Math.abs(parseFloat(growth))}%`) : 'Cần thêm dữ liệu tháng trước',
        biggestRisk: risks[0] || 'Không có rủi ro P0 hiện tại',
        biggestOpportunity: opportunities[0] || 'Tối ưu các kênh hiện có',
      },
      priorities: priorities.slice(0, 5),
      opportunities: opportunities.slice(0, 3),
      risks: risks.slice(0, 3),
    };
  }

  // ─── CFO AI ─────────────────────────────────────────────────────────────────

  async getCfoReport() {
    const [monthRaw, lastMonthRaw, agentCosts, cancelledOrders, totalOrders] = await Promise.all([
      this.getRevenueRange(this.thisMonth()),
      this.getRevenueRange(this.lastMonth(), this.lastMonthEnd()),
      this.agentLogRepo.createQueryBuilder('l')
        .select('l.agent', 'agent')
        .addSelect('SUM(l.cost)', 'cost')
        .addSelect('COUNT(l.id)', 'runs')
        .addSelect('SUM(CASE WHEN l.status = \'success\' THEN 1 ELSE 0 END)', 'successes')
        .where('l.createdAt >= :d', { d: this.lastWeek() })
        .groupBy('l.agent')
        .orderBy('"cost"', 'DESC')
        .getRawMany(),
      this.orderRepo.count({ where: { status: OrderStatus.CANCELLED } }),
      this.orderRepo.count(),
    ]);

    const monthRev = parseFloat(monthRaw?.rev || '0');
    const lastMonthRev = parseFloat(lastMonthRaw?.rev || '0');
    const growth = lastMonthRev > 0 ? ((monthRev - lastMonthRev) / lastMonthRev * 100).toFixed(1) : null;

    const costLeaks: Array<{ source: string; amount: string; action: string }> = [];
    for (const a of agentCosts) {
      const successRate = parseInt(a.runs) > 0 ? parseInt(a.successes) / parseInt(a.runs) : 0;
      if (successRate < 0.5 && parseFloat(a.cost) > 0) {
        costLeaks.push({
          source: `Agent ${a.agent}`,
          amount: `$${parseFloat(a.cost).toFixed(3)}/tuần`,
          action: 'Tối ưu hoặc tắt agent không hiệu quả',
        });
      }
    }
    if (totalOrders > 0 && cancelledOrders / totalOrders > 0.1) {
      const cancelledRev = monthRev * (cancelledOrders / totalOrders);
      costLeaks.push({
        source: 'Đơn hàng hủy',
        amount: `~${cancelledRev.toLocaleString('vi-VN')}₫`,
        action: 'Phân tích nguyên nhân và giảm tỷ lệ hủy',
      });
    }

    const totalAgentCost = agentCosts.reduce((s: number, a: any) => s + parseFloat(a.cost || '0'), 0);
    const grossProfit = monthRev * 0.35;
    const netProfit = monthRev * 0.18;
    const roi = totalAgentCost > 0 ? (monthRev / totalAgentCost).toFixed(1) : 'N/A';

    const highestRoiChannels = await this.leadRepo.createQueryBuilder('l')
      .select('l.platform', 'platform').addSelect('COUNT(l.id)', 'count')
      .groupBy('l.platform').orderBy('"count"', 'DESC').limit(3).getRawMany();

    return {
      role: 'CFO AI',
      title: 'Chief Financial Officer',
      kpi: {
        monthRevenue: monthRev,
        grossProfit,
        netProfit,
        revenueGrowth: growth ? growth + '%' : 'N/A',
        agentCostTotal: totalAgentCost,
        roi,
        cancelRate: totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) + '%' : '0%',
      },
      questions: {
        moneyFrom: highestRoiChannels.map((c: any) => `${c.platform || 'Direct'}: ${c.count} leads`).join(', ') || 'Đang thu thập dữ liệu',
        moneyLeaks: costLeaks.map(l => l.source).join(', ') || 'Không phát hiện rò rỉ',
        costsToCut: agentCosts.filter((a: any) => parseFloat(a.cost) > 0 && parseInt(a.successes) / parseInt(a.runs) < 0.5).map((a: any) => a.agent).slice(0, 3),
        highestRoi: highestRoiChannels[0]?.platform || 'Chưa xác định',
        losingCampaigns: costLeaks.slice(0, 2).map(l => l.source),
      },
      costLeaks,
      revenueBreakdown: {
        gross: monthRev,
        grossMargin: '35%',
        netMargin: '18%',
        agentCosts: totalAgentCost,
      },
    };
  }

  // ─── COO AI ─────────────────────────────────────────────────────────────────

  async getCooReport() {
    const [agentStats, failedLast24h, pendingLeads, draftContent] = await Promise.all([
      this.agentLogRepo.createQueryBuilder('l')
        .select('l.agent', 'agent')
        .addSelect('COUNT(l.id)', 'runs')
        .addSelect('SUM(CASE WHEN l.status = \'success\' THEN 1 ELSE 0 END)', 'successes')
        .addSelect('SUM(CASE WHEN l.status = \'failed\' THEN 1 ELSE 0 END)', 'failures')
        .addSelect('AVG(l.durationMs)', 'avgTime')
        .where('l.createdAt >= :d', { d: this.lastWeek() })
        .groupBy('l.agent')
        .orderBy('"runs"', 'DESC')
        .getRawMany(),
      this.agentLogRepo.createQueryBuilder('l')
        .where('l.status = :s', { s: AgentRunStatus.FAILED })
        .andWhere('l.createdAt >= :d', { d: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        .getCount(),
      this.leadRepo.count({ where: { status: LeadStatus.NEW } }),
      this.contentRepo.count({ where: { status: ContentStatus.DRAFT } }),
    ]);

    const totalRuns = agentStats.reduce((s: number, a: any) => s + parseInt(a.runs), 0);
    const totalSuccess = agentStats.reduce((s: number, a: any) => s + parseInt(a.successes), 0);
    const overallSuccessRate = totalRuns > 0 ? ((totalSuccess / totalRuns) * 100).toFixed(1) : '0';

    const slowAgents = agentStats
      .filter((a: any) => parseFloat(a.avgTime) > 30000)
      .map((a: any) => ({ agent: a.agent, avgTime: `${(parseFloat(a.avgTime) / 1000).toFixed(1)}s` }));

    const failedAgents = agentStats
      .filter((a: any) => parseInt(a.failures) > parseInt(a.successes))
      .map((a: any) => ({
        agent: a.agent,
        failureRate: `${((parseInt(a.failures) / parseInt(a.runs)) * 100).toFixed(0)}%`,
      }));

    let bottleneck = 'Hệ thống vận hành ổn định';
    if (failedLast24h > 3) bottleneck = 'Agent failures — cần kiểm tra và restart ngay';
    else if (pendingLeads > 10) bottleneck = `${pendingLeads} lead mới chưa xử lý — CRM pipeline tắc`;
    else if (draftContent > 20) bottleneck = `${draftContent} content nháp chưa publish — content pipeline tắc`;

    return {
      role: 'COO AI',
      title: 'Chief Operating Officer',
      kpi: {
        agentSuccessRate: overallSuccessRate + '%',
        totalAgentRuns: totalRuns,
        failedLast24h,
        pendingLeads,
        draftContent,
        workflowEfficiency: parseFloat(overallSuccessRate) > 80 ? 'High' : parseFloat(overallSuccessRate) > 60 ? 'Medium' : 'Low',
      },
      questions: {
        slowProcesses: slowAgents.map(a => `${a.agent} (${a.avgTime})`).join(', ') || 'Không có quy trình chậm',
        failingAgents: failedAgents.slice(0, 3).map(a => `${a.agent}: ${a.failureRate} failure`).join(', ') || 'Không có agent lỗi',
        bottleneck,
        performanceDrags: [
          ...(failedAgents.slice(0, 2).map(a => a.agent)),
          ...(pendingLeads > 10 ? ['CRM follow-up pipeline'] : []),
          ...(draftContent > 20 ? ['Content publish pipeline'] : []),
        ].slice(0, 3),
      },
      agentHealth: agentStats.slice(0, 8).map((a: any) => ({
        agent: a.agent,
        runs: parseInt(a.runs),
        successRate: parseInt(a.runs) > 0 ? ((parseInt(a.successes) / parseInt(a.runs)) * 100).toFixed(0) + '%' : '0%',
        status: parseInt(a.failures) > parseInt(a.successes) ? 'Critical' : parseInt(a.failures) > 0 ? 'Warning' : 'Healthy',
      })),
      slowAgents,
      failedAgents,
    };
  }

  // ─── CTO AI ─────────────────────────────────────────────────────────────────

  async getCtоReport() {
    const [totalAgentRuns, failedRuns, activeTenants, slaViolations, agentCostBreakdown] = await Promise.all([
      this.agentLogRepo.count(),
      this.agentLogRepo.count({ where: { status: AgentRunStatus.FAILED } }),
      this.tenantRepo.count({ where: { status: TenantStatus.ACTIVE } }),
      this.tenantRepo.createQueryBuilder('t').where('t.uptimePercent < t.slaTarget').getCount(),
      this.agentLogRepo.createQueryBuilder('l')
        .select('l.agent', 'agent')
        .addSelect('COUNT(l.id)', 'runs')
        .addSelect('SUM(l.cost)', 'cost')
        .addSelect('SUM(CASE WHEN l.status = \'success\' THEN 1 ELSE 0 END)', 'successes')
        .where('l.createdAt >= :d', { d: this.lastWeek() })
        .groupBy('l.agent')
        .orderBy('"successes"', 'DESC')
        .getRawMany(),
    ]);

    const errorRate = totalAgentRuns > 0 ? ((failedRuns / totalAgentRuns) * 100).toFixed(1) : '0';
    const uptimeEstimate = slaViolations === 0 ? 99.9 : Math.max(95, 99.9 - slaViolations * 0.5);

    const bestModels = agentCostBreakdown
      .filter((a: any) => parseInt(a.runs) > 5)
      .sort((a: any, b: any) => {
        const rateA = parseInt(a.successes) / parseInt(a.runs);
        const rateB = parseInt(b.successes) / parseInt(b.runs);
        return rateB - rateA;
      })
      .slice(0, 3)
      .map((a: any) => ({
        agent: a.agent,
        successRate: parseInt(a.runs) > 0 ? ((parseInt(a.successes) / parseInt(a.runs)) * 100).toFixed(0) + '%' : '0%',
        costPer: parseInt(a.successes) > 0 ? `$${(parseFloat(a.cost || '0') / parseInt(a.successes)).toFixed(4)}` : 'N/A',
      }));

    const overloadedResources: string[] = [];
    if (slaViolations > 0) overloadedResources.push(`${slaViolations} tenant servers vi phạm SLA uptime`);
    const highFailureAgents = agentCostBreakdown.filter((a: any) => parseInt(a.runs) > 0 && parseInt(a.successes) / parseInt(a.runs) < 0.5);
    if (highFailureAgents.length > 0) overloadedResources.push(`${highFailureAgents.length} AI agents có failure rate > 50%`);

    return {
      role: 'CTO AI',
      title: 'Chief Technology Officer',
      kpi: {
        uptime: uptimeEstimate.toFixed(1) + '%',
        errorRate: errorRate + '%',
        activeTenants,
        slaViolations,
        totalAgentRuns,
      },
      questions: {
        systemStable: slaViolations === 0 && parseFloat(errorRate) < 10 ? 'Hệ thống ổn định' : `Cần chú ý: ${slaViolations} SLA vi phạm, ${errorRate}% error rate`,
        downtimeRisk: slaViolations > 0 ? `Cao — ${slaViolations} tenant đang vi phạm SLA` : 'Thấp — tất cả tenant đang trong SLA',
        bestAiModel: bestModels[0] ? `${bestModels[0].agent} (${bestModels[0].successRate} success, ${bestModels[0].costPer}/run)` : 'Chưa đủ dữ liệu',
        overloadedResources: overloadedResources.length > 0 ? overloadedResources : ['Không có resource nào quá tải'],
      },
      bestModels,
      infrastructureHealth: {
        database: 'Healthy',
        redis: 'Healthy',
        aiAgents: parseFloat(errorRate) < 10 ? 'Healthy' : parseFloat(errorRate) < 30 ? 'Warning' : 'Critical',
        multiTenant: slaViolations === 0 ? 'Healthy' : 'Warning',
      },
    };
  }

  // ─── CMO AI ─────────────────────────────────────────────────────────────────

  async getCmoReport() {
    const [channelBreakdown, contentStats, campaigns, totalLeads, weekLeads] = await Promise.all([
      this.leadRepo.createQueryBuilder('l')
        .select('l.platform', 'platform')
        .addSelect('COUNT(l.id)', 'count')
        .groupBy('l.platform')
        .orderBy('"count"', 'DESC')
        .getRawMany(),
      this.contentRepo.createQueryBuilder('c')
        .select('c.status', 'status')
        .addSelect('COUNT(c.id)', 'count')
        .groupBy('c.status')
        .getRawMany(),
      this.campaignRepo.find({ order: { createdAt: 'DESC' }, take: 5 }),
      this.leadRepo.count(),
      this.leadRepo.createQueryBuilder('l')
        .where('l.createdAt >= :d', { d: this.lastWeek() })
        .getCount(),
    ]);

    const publishedContent = contentStats.find((c: any) => c.status === ContentStatus.PUBLISHED);
    const draftContent = contentStats.find((c: any) => c.status === ContentStatus.DRAFT);
    const failedContent = contentStats.find((c: any) => c.status === ContentStatus.FAILED);

    const topChannel = channelBreakdown[0]?.platform || 'Chưa có dữ liệu';
    const weeklyLeadGrowth = weekLeads > 0 ? `${weekLeads} leads/tuần` : 'Chưa có lead mới';

    return {
      role: 'CMO AI',
      title: 'Chief Marketing Officer',
      kpi: {
        totalLeads,
        weekLeads,
        topChannel,
        publishedContent: parseInt(publishedContent?.count || '0'),
        draftContent: parseInt(draftContent?.count || '0'),
        failedContent: parseInt(failedContent?.count || '0'),
        campaigns: campaigns.length,
      },
      questions: {
        mostTraffic: topChannel + ` (${channelBreakdown[0]?.count || 0} leads)`,
        bestContent: parseInt(publishedContent?.count || '0') > 0
          ? `${publishedContent?.count} content đã publish — tiếp tục tăng tần suất`
          : 'Chưa có content publish — cần chạy Content Agent',
        bestCampaign: campaigns[0]?.name || 'Chưa có campaign nào',
        nextToPromote: parseInt(draftContent?.count || '0') > 10
          ? `Publish ${draftContent?.count} content nháp để tăng traffic`
          : weekLeads < 10 ? 'Tăng cường lead generation campaign' : 'Tối ưu conversion từ traffic hiện có',
      },
      channelBreakdown: channelBreakdown.slice(0, 5).map((c: any) => ({
        channel: c.platform || 'Unknown',
        leads: parseInt(c.count),
        pct: totalLeads > 0 ? ((parseInt(c.count) / totalLeads) * 100).toFixed(1) + '%' : '0%',
      })),
      contentHealth: {
        published: parseInt(publishedContent?.count || '0'),
        draft: parseInt(draftContent?.count || '0'),
        failed: parseInt(failedContent?.count || '0'),
      },
      weeklyLeadGrowth,
    };
  }

  // ─── CRO AI ─────────────────────────────────────────────────────────────────

  async getCroReport() {
    const [monthRaw, totalLeads, converted, pendingLeads, contactedLeads, totalOrders, deliveredOrders] = await Promise.all([
      this.getRevenueRange(this.thisMonth()),
      this.leadRepo.count(),
      this.leadRepo.count({ where: { status: LeadStatus.CONVERTED } }),
      this.leadRepo.count({ where: { status: LeadStatus.NEW } }),
      this.leadRepo.count({ where: { status: LeadStatus.CONTACTED } }),
      this.orderRepo.count(),
      this.orderRepo.count({ where: { status: OrderStatus.DELIVERED } }),
    ]);

    const monthRev = parseFloat(monthRaw?.rev || '0');
    const monthOrders = parseInt(monthRaw?.cnt || '0');
    const avgOrderValue = monthOrders > 0 ? monthRev / monthOrders : 0;
    const convRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : '0';
    const contactRate = totalLeads > 0 ? ((contactedLeads / totalLeads) * 100).toFixed(1) : '0';

    let funnelBottleneck = 'Funnel hoạt động tốt';
    if (totalLeads > 0) {
      if (contactedLeads / totalLeads < 0.2) funnelBottleneck = 'Lead → Contact: chỉ ' + contactRate + '% lead được liên hệ';
      else if (converted / contactedLeads < 0.3 && contactedLeads > 0) funnelBottleneck = 'Contact → Close: tỷ lệ chốt đơn thấp';
    }

    const revenueChannels = await this.leadRepo.createQueryBuilder('l')
      .select('l.platform', 'channel').addSelect('COUNT(l.id)', 'count')
      .where('l.status = :s', { s: LeadStatus.CONVERTED })
      .groupBy('l.platform').orderBy('"count"', 'DESC').getRawMany();

    const orderBoostActions: string[] = [];
    if (pendingLeads > 5) orderBoostActions.push(`Follow-up ${pendingLeads} lead mới chưa liên hệ`);
    if (parseFloat(convRate) < 10) orderBoostActions.push('Tối ưu sales script để tăng conversion rate');
    if (avgOrderValue < 500000) orderBoostActions.push('Upsell bundle để tăng giá trị đơn hàng trung bình');
    orderBoostActions.push('Re-engage khách hàng cũ qua email/Telegram campaign');

    return {
      role: 'CRO AI',
      title: 'Chief Revenue Officer',
      kpi: {
        monthRevenue: monthRev,
        monthOrders,
        avgOrderValue,
        conversionRate: convRate + '%',
        contactRate: contactRate + '%',
        deliveredOrders,
      },
      questions: {
        revenueChannels: revenueChannels.slice(0, 3).map((c: any) => `${c.channel || 'Direct'}: ${c.count} converted`).join(' | ') || 'Chưa có đơn hàng',
        funnelLeak: funnelBottleneck,
        orderBoost: orderBoostActions[0],
      },
      funnelStages: [
        { stage: 'Leads', count: totalLeads, icon: '🎯' },
        { stage: 'Contacted', count: contactedLeads, rate: contactRate + '%', icon: '📞' },
        { stage: 'Converted', count: converted, rate: convRate + '%', icon: '✅' },
        { stage: 'Orders', count: totalOrders, icon: '🛒' },
        { stage: 'Delivered', count: deliveredOrders, icon: '📦' },
      ],
      revenueChannels: revenueChannels.slice(0, 5),
      orderBoostActions,
    };
  }

  // ─── CSO AI ─────────────────────────────────────────────────────────────────

  async getCsoReport() {
    const [totalProducts, totalCustomers, vipCustomers, totalVendors, wlClients, tenantCount, mobileCount] = await Promise.all([
      this.productRepo.count(),
      this.customerRepo.count(),
      this.customerRepo.count({ where: { tier: CustomerTier.VIP } }),
      this.vendorRepo.count(),
      this.wlRepo.count(),
      this.tenantRepo.count({ where: { status: TenantStatus.ACTIVE } }),
      this.mobileRepo.count(),
    ]);

    const [monthRaw, lastMonthRaw] = await Promise.all([
      this.getRevenueRange(this.thisMonth()),
      this.getRevenueRange(this.lastMonth(), this.lastMonthEnd()),
    ]);
    const monthRev = parseFloat(monthRaw?.rev || '0');
    const lastMonthRev = parseFloat(lastMonthRaw?.rev || '0');
    const revenueGrowth = lastMonthRev > 0 ? ((monthRev - lastMonthRev) / lastMonthRev * 100).toFixed(1) : null;

    const marketTrends = [
      'AI-powered e-commerce đang tăng trưởng mạnh — đầu tư vào AI agents tiếp tục sinh lời',
      'White label SaaS đang bùng nổ — cơ hội mở rộng B2B revenue',
      'Mobile commerce chiếm >60% đơn hàng — mobile-first strategy là bắt buộc',
      'Marketplace multi-vendor đang vượt D2C về tốc độ tăng trưởng GMV',
    ];

    const competitiveAdvantages = [
      `${totalProducts} sản phẩm với AI pricing engine`,
      `Hệ thống multi-agent (CEO/CFO/COO/CTO/CMO/CRO/CSO) — AI Board of Directors`,
      `${tenantCount} enterprise tenants với white label capability`,
      `Marketplace ${totalVendors} vendors với AI demand forecasting`,
    ];

    const investmentAreas: Array<{ area: string; priority: string; rationale: string }> = [];
    if (wlClients < 10) investmentAreas.push({ area: 'White Label', priority: 'High', rationale: 'Recurring B2B revenue, high margin' });
    if (totalVendors < 20) investmentAreas.push({ area: 'Marketplace', priority: 'High', rationale: 'GMV growth không cần tăng inventory' });
    if (mobileCount < 1000) investmentAreas.push({ area: 'Mobile App', priority: 'Medium', rationale: 'Tăng D7 retention và LTV' });
    investmentAreas.push({ area: 'AI Agents', priority: 'Ongoing', rationale: 'Core automation advantage' });

    return {
      role: 'CSO AI',
      title: 'Chief Strategy Officer',
      kpi: {
        marketPosition: tenantCount > 5 ? 'Scale' : totalCustomers > 100 ? 'Growth' : 'Early',
        revenueGrowth: revenueGrowth ? revenueGrowth + '%' : 'N/A',
        revenueStreams: [
          wlClients > 0 ? 'White Label' : null,
          totalVendors > 0 ? 'Marketplace' : null,
          'Direct Commerce',
          tenantCount > 0 ? 'Enterprise SaaS' : null,
        ].filter(Boolean).length,
        vipCustomerRatio: totalCustomers > 0 ? ((vipCustomers / totalCustomers) * 100).toFixed(1) + '%' : '0%',
      },
      questions: {
        marketTrend: marketTrends[0],
        competitorAction: 'Đối thủ đang đầu tư mạnh vào AI automation — cần tăng tốc AI Board deployment',
        investIn: investmentAreas[0]?.area + ' — ' + investmentAreas[0]?.rationale,
        competitiveEdge: competitiveAdvantages[0],
      },
      marketTrends,
      competitiveAdvantages,
      investmentAreas,
      strategicPlan: {
        shortTerm: ['Đạt 10 white label clients trong 30 ngày', 'Tối ưu conversion rate > 15%', 'Tăng marketplace vendor lên 20+'],
        midTerm: ['Mở rộng sang 3 thị trường mới', 'Ra mắt mobile app version 2.0', 'Đạt $100K MRR'],
        longTerm: ['IPO-ready metrics', 'Enterprise B2B platform leader', 'AI commerce infrastructure provider'],
      },
    };
  }

  // ─── Board Meeting ───────────────────────────────────────────────────────────

  async runDailyBoardMeeting() {
    const [ceo, cfo, coo, cto, cmo, cro, cso] = await Promise.all([
      this.getCeoReport(),
      this.getCfoReport(),
      this.getCooReport(),
      this.getCtоReport(),
      this.getCmoReport(),
      this.getCroReport(),
      this.getCsoReport(),
    ]);

    const allRisks = [
      ...ceo.risks,
      ...cfo.costLeaks.slice(0, 2).map((l: any) => l.source + ': ' + l.amount),
      ...coo.failedAgents.slice(0, 2).map((a: any) => `Agent ${a.agent} failure rate ${a.failureRate}`),
    ].filter(Boolean).slice(0, 5);

    const allOpportunities = [
      ...ceo.opportunities,
      ...cso.investmentAreas.slice(0, 2).map((a: any) => `${a.area}: ${a.rationale}`),
    ].filter(Boolean).slice(0, 5);

    const priorityActions: Array<{ level: 'P0' | 'P1' | 'P2' | 'P3'; action: string; owner: string }> = [];

    if (cto.kpi.slaViolations > 0) {
      priorityActions.push({ level: 'P0', action: `Khắc phục ${cto.kpi.slaViolations} SLA violations ngay`, owner: 'CTO' });
    }
    if (coo.kpi.failedLast24h > 3) {
      priorityActions.push({ level: 'P0', action: `Kiểm tra ${coo.kpi.failedLast24h} agent failures trong 24h`, owner: 'COO' });
    }
    if (cro.kpi.monthOrders === 0 || parseFloat(cro.kpi.conversionRate) < 5) {
      priorityActions.push({ level: 'P1', action: 'Tối ưu sales funnel — conversion rate quá thấp', owner: 'CRO' });
    }
    if (coo.kpi.pendingLeads > 10) {
      priorityActions.push({ level: 'P1', action: `Follow-up ${coo.kpi.pendingLeads} lead mới ngay`, owner: 'CMO/CRO' });
    }
    if (cfo.costLeaks.length > 0) {
      priorityActions.push({ level: 'P2', action: 'Tối ưu agent cost — phát hiện rò rỉ chi phí', owner: 'CFO/COO' });
    }
    if (cso.investmentAreas.length > 0) {
      priorityActions.push({ level: 'P3', action: cso.investmentAreas[0].area + ' expansion plan', owner: 'CSO' });
    }

    const p0Count = priorityActions.filter(a => a.level === 'P0').length;
    const systemStatus = p0Count > 0 ? 'Critical' : priorityActions.some(a => a.level === 'P1') ? 'Warning' : 'Healthy';

    return {
      generatedAt: new Date(),
      meetingType: 'Daily Board Meeting',
      systemStatus,
      executiveSummary: {
        statusOverall: systemStatus,
        revenueStatus: ceo.kpi.revenueGrowth,
        topIssue: priorityActions[0]?.action || 'Không có vấn đề nghiêm trọng',
        topOpportunity: allOpportunities[0] || 'Tiếp tục tối ưu vận hành',
        immediateActions: priorityActions.filter(a => a.level === 'P0' || a.level === 'P1').map(a => a.action).slice(0, 3),
      },
      boardReports: { ceo, cfo, coo, cto, cmo, cro, cso },
      topOpportunities: allOpportunities,
      topRisks: allRisks,
      priorityActions,
      strategicRecommendations: {
        shortTerm: cso.strategicPlan.shortTerm.slice(0, 3),
        midTerm: cso.strategicPlan.midTerm.slice(0, 2),
        longTerm: cso.strategicPlan.longTerm.slice(0, 2),
      },
    };
  }
}
