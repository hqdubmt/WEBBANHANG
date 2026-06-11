import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Lead, LeadStatus } from '../../database/entities/lead.entity';
import { Customer, CustomerTier } from '../../database/entities/customer.entity';
import { AgentLog, AgentRunStatus } from '../../database/entities/agent-log.entity';
import { Content } from '../../database/entities/content.entity';
import { Campaign } from '../../database/entities/campaign.entity';
import { LearningCycle, CycleScope, CyclePhase, CycleStatus } from '../../database/entities/learning-cycle.entity';
import { LessonLearned, LessonType, LessonDomain, LessonStatus } from '../../database/entities/lesson-learned.entity';
import { DecisionMemory, DecisionArea, DecisionOutcome } from '../../database/entities/decision-memory.entity';
import { Experiment, ExperimentStatus, ExperimentDecision } from '../../database/entities/experiment.entity';
import { PerformanceScorecard, ScorecardPeriod } from '../../database/entities/performance-scorecard.entity';

@Injectable()
export class SelfImprovementService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(AgentLog) private readonly agentLogRepo: Repository<AgentLog>,
    @InjectRepository(Content) private readonly contentRepo: Repository<Content>,
    @InjectRepository(Campaign) private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(LearningCycle) private readonly cycleRepo: Repository<LearningCycle>,
    @InjectRepository(LessonLearned) private readonly lessonRepo: Repository<LessonLearned>,
    @InjectRepository(DecisionMemory) private readonly decisionRepo: Repository<DecisionMemory>,
    @InjectRepository(Experiment) private readonly experimentRepo: Repository<Experiment>,
    @InjectRepository(PerformanceScorecard) private readonly scorecardRepo: Repository<PerformanceScorecard>,
  ) {}

  // ─── PHASE 1: Observation ───────────────────────────────────────────────────

  async observe() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

    const [
      todayOrders,
      monthRevRaw,
      lastMonthRevRaw,
      totalLeads,
      newLeads24h,
      totalCustomers,
      agentRuns24h,
      agentFails24h,
      activeContent,
      campaigns,
    ] = await Promise.all([
      this.orderRepo.count({ where: { createdAt: since24h as any } }),
      this.orderRepo.createQueryBuilder('o').select('COALESCE(SUM(o.total),0)', 'rev')
        .where('o.createdAt >= :d', { d: thisMonth }).andWhere('o.status != :c', { c: OrderStatus.CANCELLED }).getRawOne(),
      this.orderRepo.createQueryBuilder('o').select('COALESCE(SUM(o.total),0)', 'rev')
        .where('o.createdAt >= :s AND o.createdAt <= :e', { s: lastMonth, e: lastMonthEnd }).andWhere('o.status != :c', { c: OrderStatus.CANCELLED }).getRawOne(),
      this.leadRepo.count(),
      this.leadRepo.count({ where: { createdAt: since24h as any } }),
      this.customerRepo.count(),
      this.agentLogRepo.count({ where: { createdAt: since24h as any } }),
      this.agentLogRepo.count({ where: { status: AgentRunStatus.FAILED, createdAt: since24h as any } }),
      this.contentRepo.count(),
      this.campaignRepo.count(),
    ]);

    const monthRev = parseFloat(monthRevRaw?.rev || '0');
    const lastRev = parseFloat(lastMonthRevRaw?.rev || '0');
    const revenueGrowth = lastRev > 0 ? (((monthRev - lastRev) / lastRev) * 100).toFixed(1) : '0';
    const agentSuccessRate = agentRuns24h > 0 ? (((agentRuns24h - agentFails24h) / agentRuns24h) * 100).toFixed(1) : '100';

    return {
      phase: CyclePhase.OBSERVE,
      kpi: {
        orders24h: todayOrders,
        monthRevenue: monthRev,
        lastMonthRevenue: lastRev,
        revenueGrowth: revenueGrowth + '%',
        totalLeads,
        newLeads24h,
        totalCustomers,
      },
      logs: {
        agentRuns24h,
        agentFails24h,
        agentSuccessRate: agentSuccessRate + '%',
      },
      metrics: {
        activeContent,
        campaigns,
      },
      observedAt: new Date(),
    };
  }

  // ─── PHASE 2: Evaluation ────────────────────────────────────────────────────

  async evaluate() {
    const obs = await this.observe();
    const growth = parseFloat(obs.kpi.revenueGrowth);
    const agentRate = parseFloat(obs.logs.agentSuccessRate);

    const successes: string[] = [];
    const failures: string[] = [];
    const unexpected: string[] = [];

    if (growth > 10) successes.push(`Doanh thu tăng ${obs.kpi.revenueGrowth} so với tháng trước`);
    if (obs.kpi.newLeads24h > 10) successes.push(`Thu thập ${obs.kpi.newLeads24h} leads mới trong 24h`);
    if (agentRate >= 95) successes.push(`Agents hoạt động ổn định: ${obs.logs.agentSuccessRate} thành công`);

    if (growth < 0) failures.push(`Doanh thu giảm ${Math.abs(growth).toFixed(1)}% so với tháng trước`);
    if (obs.kpi.newLeads24h === 0) failures.push('Không có leads mới trong 24h — kênh marketing cần xem lại');
    if (agentRate < 80) failures.push(`Agents không ổn định: ${obs.logs.agentSuccessRate} — cần điều tra`);

    if (growth > 50) unexpected.push(`Tăng trưởng đột biến ${obs.kpi.revenueGrowth} — cần xác nhận nguồn`);
    if (obs.logs.agentFails24h > obs.logs.agentRuns24h * 0.3) unexpected.push('Tỷ lệ thất bại agent cao bất thường');

    return {
      phase: CyclePhase.ANALYZE,
      observations: obs,
      successes,
      failures,
      unexpected,
      overallHealth: failures.length === 0 ? 'healthy' : failures.length <= 1 ? 'warning' : 'critical',
      evaluatedAt: new Date(),
    };
  }

  // ─── PHASE 3: Root Cause Analysis ──────────────────────────────────────────

  async analyzeRootCause() {
    const evaluation = await this.evaluate();
    const issues = evaluation.failures.map((f, i) => ({
      id: i + 1,
      symptom: f,
      rootCause: this.inferRootCause(f),
      impact: this.inferImpact(f),
      priority: i === 0 ? 'P0' : i === 1 ? 'P1' : 'P2',
    }));

    return {
      phase: CyclePhase.ANALYZE,
      issues,
      evaluation,
      analysisAt: new Date(),
    };
  }

  // ─── PHASE 4: Lesson Extraction ─────────────────────────────────────────────

  async extractLessons() {
    const analysis = await this.analyzeRootCause();

    const newLessons = analysis.issues.map((issue) => ({
      type: LessonType.FAILURE,
      domain: this.issueToLessonDomain(issue.symptom),
      whatHappened: issue.symptom,
      whyItHappened: issue.rootCause,
      whatWeLearned: `Cần theo dõi sát hơn: ${issue.symptom}`,
      whatToChange: `Ưu tiên ${issue.priority}: ${issue.impact}`,
      symptom: issue.symptom,
      rootCause: issue.rootCause,
      impact: issue.impact,
      priority: issue.priority,
    }));

    const savedLessons = await Promise.all(
      newLessons.map((l) => this.lessonRepo.save(this.lessonRepo.create(l))),
    );

    const allActiveLessons = await this.lessonRepo.find({
      where: { status: LessonStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      phase: CyclePhase.LEARN,
      newLessons: savedLessons.length,
      activeLessons: allActiveLessons,
    };
  }

  // ─── PHASE 5: Improvement Plan ──────────────────────────────────────────────

  async buildImprovementPlan() {
    const lessons = await this.extractLessons();
    const recentDecisions = await this.decisionRepo.find({ order: { createdAt: 'DESC' }, take: 5 });

    const plan = {
      stop: lessons.activeLessons
        .filter((l) => l.type === LessonType.FAILURE && l.priority === 'P0')
        .map((l) => l.whatToChange),
      fix: lessons.activeLessons
        .filter((l) => l.type === LessonType.FAILURE)
        .map((l) => `Fix: ${l.rootCause}`),
      amplify: lessons.activeLessons
        .filter((l) => l.type === LessonType.SUCCESS)
        .map((l) => `Tăng cường: ${l.whatHappened}`),
      experiment: lessons.activeLessons
        .filter((l) => l.type === LessonType.UNEXPECTED)
        .map((l) => `Thử nghiệm: ${l.whatToChange}`),
    };

    return {
      phase: CyclePhase.IMPROVE,
      plan,
      lessonCount: lessons.newLessons,
      recentDecisions: recentDecisions.map((d) => ({
        id: d.id,
        decision: d.decision,
        outcome: d.outcome,
        area: d.area,
      })),
    };
  }

  // ─── Daily Learning Loop ────────────────────────────────────────────────────

  async getDailyLoop(): Promise<Record<string, any>> {
    const [obs, activeLessons, scorecardToday] = await Promise.all([
      this.observe(),
      this.lessonRepo.find({ where: { status: LessonStatus.ACTIVE }, order: { createdAt: 'DESC' }, take: 5 }),
      this.getTodayScorecard(),
    ]);

    const growth = parseFloat(obs.kpi.revenueGrowth);

    return {
      date: new Date().toISOString().split('T')[0],
      questions: [
        {
          id: 1,
          question: 'Điều gì hoạt động tốt nhất hôm nay?',
          answer: obs.kpi.newLeads24h > 0
            ? `Thu thập ${obs.kpi.newLeads24h} leads mới — kênh acquisition đang hoạt động`
            : obs.kpi.orders24h > 0
              ? `${obs.kpi.orders24h} đơn hàng mới trong 24h`
              : 'Hệ thống duy trì hoạt động ổn định',
        },
        {
          id: 2,
          question: 'Điều gì hoạt động tệ nhất hôm nay?',
          answer: parseInt(obs.logs.agentSuccessRate) < 90
            ? `Agents có ${obs.logs.agentFails24h} lỗi — cần kiểm tra`
            : growth < 0
              ? `Doanh thu tháng này giảm ${Math.abs(growth).toFixed(1)}% so với tháng trước`
              : 'Không có vấn đề nghiêm trọng ghi nhận',
        },
        {
          id: 3,
          question: 'Điều gì làm tăng doanh thu?',
          answer: growth > 0
            ? `Doanh thu tháng tăng ${obs.kpi.revenueGrowth} — chiến dịch hiện tại hiệu quả`
            : 'Cần tăng tỷ lệ chuyển đổi leads → orders',
        },
        {
          id: 4,
          question: 'Điều gì làm giảm doanh thu?',
          answer: growth < 0
            ? `Doanh thu giảm ${Math.abs(growth).toFixed(1)}% — phân tích nguyên nhân cần thiết`
            : 'Không có tín hiệu tiêu cực rõ ràng về doanh thu',
        },
        {
          id: 5,
          question: 'Điều gì nên tiếp tục?',
          answer: obs.logs.agentSuccessRate >= '95'
            ? 'Tiếp tục vận hành agents theo cấu hình hiện tại'
            : 'Tiếp tục thu thập leads và theo dõi funnel',
        },
        {
          id: 6,
          question: 'Điều gì nên dừng lại?',
          answer: activeLessons.filter((l) => l.type === LessonType.FAILURE).length > 0
            ? activeLessons.filter((l) => l.type === LessonType.FAILURE)[0].whatToChange
            : 'Không có chiến lược nào cần dừng ngay lập tức',
        },
      ],
      metrics: obs.kpi,
      activeWarnings: activeLessons.filter((l) => l.priority === 'P0' || l.priority === 'P1').length,
      scorecard: scorecardToday,
    };
  }

  // ─── Weekly Retrospective ───────────────────────────────────────────────────

  async getWeeklyRetrospective(): Promise<Record<string, any>> {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [weekOrders, weekRevRaw, weekLeads, weekAgentLogs, weekAgentFails, recentLessons] = await Promise.all([
      this.orderRepo.count({ where: { createdAt: since7d as any } }),
      this.orderRepo.createQueryBuilder('o').select('COALESCE(SUM(o.total),0)', 'rev')
        .where('o.createdAt >= :d', { d: since7d }).andWhere('o.status != :c', { c: OrderStatus.CANCELLED }).getRawOne(),
      this.leadRepo.count({ where: { createdAt: since7d as any } }),
      this.agentLogRepo.count({ where: { createdAt: since7d as any } }),
      this.agentLogRepo.count({ where: { status: AgentRunStatus.FAILED, createdAt: since7d as any } }),
      this.lessonRepo.find({ where: { status: LessonStatus.ACTIVE }, order: { createdAt: 'DESC' }, take: 10 }),
    ]);

    const weekRev = parseFloat(weekRevRaw?.rev || '0');
    const weekSuccessRate = weekAgentLogs > 0 ? (((weekAgentLogs - weekAgentFails) / weekAgentLogs) * 100).toFixed(1) : '100';

    const wins = [
      weekOrders > 0 ? `${weekOrders} đơn hàng trong tuần — doanh thu ${new Intl.NumberFormat('vi-VN').format(weekRev)}đ` : null,
      weekLeads > 0 ? `Thu thập ${weekLeads} leads mới trong tuần` : null,
      parseFloat(weekSuccessRate) >= 95 ? `Hệ thống agents ổn định: ${weekSuccessRate}% thành công` : null,
    ].filter(Boolean) as string[];

    const losses = [
      parseFloat(weekSuccessRate) < 80 ? `Agents thất bại cao: ${100 - parseFloat(weekSuccessRate)}% — cần điều tra` : null,
      weekOrders === 0 ? 'Không có đơn hàng trong tuần — kênh bán hàng cần xem lại' : null,
      weekLeads === 0 ? 'Không có leads mới — kênh acquisition ngừng hoạt động' : null,
    ].filter(Boolean) as string[];

    const opportunities = [
      weekLeads > 0 && weekOrders === 0 ? `${weekLeads} leads chưa chuyển đổi — cơ hội upsell` : null,
      weekOrders > 5 ? 'Lượng đơn hàng tốt — cơ hội tăng AOV (Average Order Value)' : null,
    ].filter(Boolean) as string[];

    const risks = recentLessons
      .filter((l) => l.type === LessonType.FAILURE && l.priority === 'P0')
      .map((l) => l.symptom || l.whatHappened);

    return {
      period: 'weekly',
      weekRange: {
        from: since7d.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
      },
      metrics: {
        orders: weekOrders,
        revenue: weekRev,
        leads: weekLeads,
        agentSuccessRate: weekSuccessRate + '%',
      },
      wins,
      losses,
      opportunities,
      risks,
      strategicAdjustments: this.generateStrategicAdjustments(wins, losses, opportunities),
      lessonsThisWeek: recentLessons.length,
    };
  }

  // ─── Monthly Evolution Review ───────────────────────────────────────────────

  async getMonthlyEvolution(): Promise<Record<string, any>> {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const [thisRevRaw, lastRevRaw, totalCustomers, newCustomers, allLessons] = await Promise.all([
      this.orderRepo.createQueryBuilder('o').select('COALESCE(SUM(o.total),0)', 'rev')
        .where('o.createdAt >= :d', { d: thisMonth }).andWhere('o.status != :c', { c: OrderStatus.CANCELLED }).getRawOne(),
      this.orderRepo.createQueryBuilder('o').select('COALESCE(SUM(o.total),0)', 'rev')
        .where('o.createdAt >= :s AND o.createdAt <= :e', { s: lastMonth, e: lastMonthEnd }).andWhere('o.status != :c', { c: OrderStatus.CANCELLED }).getRawOne(),
      this.customerRepo.count(),
      this.customerRepo.count({ where: { createdAt: thisMonth as any } }),
      this.lessonRepo.find({ order: { createdAt: 'DESC' }, take: 30 }),
    ]);

    const thisRev = parseFloat(thisRevRaw?.rev || '0');
    const lastRev = parseFloat(lastRevRaw?.rev || '0');
    const revenueGrowth = lastRev > 0 ? (((thisRev - lastRev) / lastRev) * 100) : 0;

    const agentLogs = await this.agentLogRepo.count({ where: { createdAt: thisMonth as any } });
    const agentFails = await this.agentLogRepo.count({ where: { status: AgentRunStatus.FAILED, createdAt: thisMonth as any } });
    const aiPerformance = agentLogs > 0 ? Math.round(((agentLogs - agentFails) / agentLogs) * 100) : 100;

    const winningStrategies = allLessons.filter((l) => l.type === LessonType.SUCCESS && l.isProven);
    const failedStrategies = allLessons.filter((l) => l.type === LessonType.FAILURE);
    const provenPatterns = allLessons.filter((l) => l.isProven);

    return {
      period: 'monthly',
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      evolution: {
        revenueGrowth: revenueGrowth.toFixed(1) + '%',
        profitGrowth: (revenueGrowth * 0.7).toFixed(1) + '%',
        marketPosition: revenueGrowth > 10 ? 'Đang tăng trưởng tốt' : revenueGrowth > 0 ? 'Tăng trưởng chậm' : 'Cần cải thiện',
        customerGrowth: totalCustomers > 0 ? ((newCustomers / totalCustomers) * 100).toFixed(1) + '%' : '0%',
        aiPerformance: aiPerformance + '/100',
      },
      knowledgeBrain: {
        lessons: allLessons.length,
        winningStrategies: winningStrategies.length,
        failedStrategies: failedStrategies.length,
        provenPatterns: provenPatterns.length,
      },
      evolutionLevel: this.determineEvolutionLevel(revenueGrowth, aiPerformance),
    };
  }

  // ─── Performance Scorecard ──────────────────────────────────────────────────

  async computeScorecard(period: ScorecardPeriod = ScorecardPeriod.DAILY): Promise<PerformanceScorecard> {
    const obs = await this.observe();
    const growth = parseFloat(obs.kpi.revenueGrowth);
    const agentRate = parseFloat(obs.logs.agentSuccessRate);

    const revenueScore = Math.min(100, Math.max(0, 50 + growth));
    const profitScore = Math.min(100, Math.max(0, revenueScore * 0.8));
    const growthScore = Math.min(100, Math.max(0, growth > 0 ? Math.min(100, 50 + growth * 2) : Math.max(0, 50 + growth)));
    const marketingScore = Math.min(100, Math.max(0, obs.kpi.newLeads24h > 0 ? 70 + obs.kpi.newLeads24h : 40));
    const operationsScore = Math.min(100, Math.max(0, agentRate));
    const technologyScore = Math.min(100, Math.max(0, agentRate * 0.95));
    const customerScore = Math.min(100, Math.max(0, obs.kpi.totalCustomers > 0 ? 60 : 30));
    const overallScore = Math.round((revenueScore + profitScore + growthScore + marketingScore + operationsScore + technologyScore + customerScore) / 7);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.scorecardRepo.findOne({
      where: { period, periodDate: today as any },
    });

    const data = {
      period,
      periodDate: today,
      revenueScore: Math.round(revenueScore),
      profitScore: Math.round(profitScore),
      growthScore: Math.round(growthScore),
      marketingScore: Math.round(marketingScore),
      operationsScore: Math.round(operationsScore),
      technologyScore: Math.round(technologyScore),
      customerScore: Math.round(customerScore),
      overallScore,
      rawMetrics: obs,
    };

    if (existing) {
      await this.scorecardRepo.update(existing.id, data as any);
      return { ...existing, ...data };
    }

    const entity = this.scorecardRepo.create(data as any) as unknown as PerformanceScorecard;
    return this.scorecardRepo.save(entity);
  }

  async getTodayScorecard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await this.scorecardRepo.findOne({
      where: { period: ScorecardPeriod.DAILY, periodDate: today as any },
    });
    return existing || this.computeScorecard();
  }

  async getScorecardHistory(period: ScorecardPeriod = ScorecardPeriod.DAILY, limit = 30) {
    return this.scorecardRepo.find({
      where: { period },
      order: { periodDate: 'DESC' },
      take: limit,
    });
  }

  // ─── Decision Memory CRUD ───────────────────────────────────────────────────

  async createDecision(data: {
    decision: string;
    reason: string;
    area: DecisionArea;
    expectedOutcome: string;
    riskLevel?: number;
    madeBy?: string;
  }): Promise<DecisionMemory> {
    return this.decisionRepo.save(this.decisionRepo.create(data));
  }

  async updateDecisionOutcome(id: string, actualOutcome: string, outcome: DecisionOutcome, lesson?: string) {
    await this.decisionRepo.update(id, {
      actualOutcome,
      outcome,
      lessonLearned: lesson,
      isReviewed: true,
    });
    return this.decisionRepo.findOneBy({ id });
  }

  async getDecisions(area?: DecisionArea) {
    const where = area ? { area } : {};
    return this.decisionRepo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  // ─── Experiment Framework CRUD ──────────────────────────────────────────────

  async createExperiment(data: {
    title: string;
    hypothesis: string;
    experimentPlan?: string;
    scope?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Experiment> {
    return this.experimentRepo.save(this.experimentRepo.create(data));
  }

  async updateExperiment(id: string, data: Partial<Experiment>): Promise<Experiment> {
    await this.experimentRepo.update(id, data);
    return this.experimentRepo.findOneBy({ id });
  }

  async getExperiments(status?: ExperimentStatus) {
    const where = status ? { status } : {};
    return this.experimentRepo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  // ─── Lesson Library ─────────────────────────────────────────────────────────

  async getLessons(type?: LessonType, domain?: LessonDomain) {
    const where: any = { status: LessonStatus.ACTIVE };
    if (type) where.type = type;
    if (domain) where.domain = domain;
    return this.lessonRepo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  async getWinningStrategies() {
    return this.lessonRepo.find({
      where: { type: LessonType.SUCCESS, status: LessonStatus.ACTIVE },
      order: { timesSucceeded: 'DESC' },
      take: 20,
    });
  }

  async getFailedStrategies() {
    return this.lessonRepo.find({
      where: { type: LessonType.FAILURE, status: LessonStatus.ACTIVE },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async getProvenPatterns() {
    return this.lessonRepo.find({
      where: { isProven: true, status: LessonStatus.ACTIVE },
      order: { timesSucceeded: 'DESC' },
      take: 20,
    });
  }

  // ─── Dashboard Overview ─────────────────────────────────────────────────────

  async getDashboard() {
    const [daily, scorecard, decisions, experiments, lessons] = await Promise.all([
      this.getDailyLoop(),
      this.getTodayScorecard(),
      this.decisionRepo.find({ order: { createdAt: 'DESC' }, take: 5 }),
      this.experimentRepo.find({ where: { status: ExperimentStatus.RUNNING }, take: 5 }),
      this.lessonRepo.find({ where: { status: LessonStatus.ACTIVE }, order: { createdAt: 'DESC' }, take: 5 }),
    ]);

    const winningCount = await this.lessonRepo.count({ where: { type: LessonType.SUCCESS, status: LessonStatus.ACTIVE } });
    const failedCount = await this.lessonRepo.count({ where: { type: LessonType.FAILURE, status: LessonStatus.ACTIVE } });
    const provenCount = await this.lessonRepo.count({ where: { isProven: true } });
    const totalDecisions = await this.decisionRepo.count();
    const pendingDecisions = await this.decisionRepo.count({ where: { outcome: DecisionOutcome.PENDING } });

    return {
      scorecard,
      dailyLoop: daily,
      recentDecisions: decisions,
      runningExperiments: experiments,
      recentLessons: lessons,
      stats: {
        winningStrategies: winningCount,
        failedStrategies: failedCount,
        provenPatterns: provenCount,
        totalDecisions,
        pendingDecisions,
        activeExperiments: experiments.length,
      },
      evolutionLevel: this.determineEvolutionLevel(
        parseFloat(daily.metrics.revenueGrowth),
        scorecard ? scorecard.technologyScore : 50,
      ),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private inferRootCause(symptom: string): string {
    if (symptom.includes('doanh thu giảm')) return 'Tỷ lệ chuyển đổi giảm hoặc traffic giảm';
    if (symptom.includes('leads')) return 'Kênh acquisition chưa được tối ưu';
    if (symptom.includes('agents')) return 'Cấu hình agent hoặc tài nguyên hệ thống bị thiếu';
    return 'Nguyên nhân cần điều tra thêm';
  }

  private inferImpact(symptom: string): string {
    if (symptom.includes('doanh thu')) return 'Ảnh hưởng trực tiếp đến revenue';
    if (symptom.includes('leads')) return 'Ảnh hưởng đến pipeline bán hàng';
    if (symptom.includes('agents')) return 'Ảnh hưởng đến tự động hóa';
    return 'Ảnh hưởng vận hành';
  }

  private issueToLessonDomain(symptom: string): LessonDomain {
    if (symptom.includes('doanh thu')) return LessonDomain.REVENUE;
    if (symptom.includes('leads') || symptom.includes('marketing')) return LessonDomain.MARKETING;
    if (symptom.includes('agents')) return LessonDomain.OPERATIONS;
    return LessonDomain.STRATEGY;
  }

  private generateStrategicAdjustments(wins: string[], losses: string[], opportunities: string[]): string[] {
    const adjustments: string[] = [];
    if (losses.length > wins.length) adjustments.push('Chuyển trọng tâm sang ổn định hóa vận hành');
    if (opportunities.length > 0) adjustments.push(`Khai thác cơ hội: ${opportunities[0]}`);
    if (wins.length > 0) adjustments.push(`Nhân rộng thành công: ${wins[0]}`);
    if (adjustments.length === 0) adjustments.push('Duy trì chiến lược hiện tại, tiếp tục theo dõi KPI');
    return adjustments;
  }

  private determineEvolutionLevel(revenueGrowth: number, aiPerformance: number): Record<string, any> {
    const LEVELS = [
      { level: 1, label: 'Agent System',           desc: 'Các AI agent đơn lẻ hoạt động độc lập' },
      { level: 2, label: 'Multi-Agent System',      desc: 'Nhiều agent phối hợp với nhau' },
      { level: 3, label: 'Executive AI',            desc: 'AI điều phối và ra quyết định cao cấp' },
      { level: 4, label: 'Business Operating System', desc: 'BOS theo dõi và điều hành toàn bộ vận hành' },
      { level: 5, label: 'Knowledge Brain',         desc: 'Hệ thống tri thức tập trung, một nguồn sự thật' },
      { level: 6, label: 'AI Board Of Directors',   desc: 'Ban điều hành AI: CEO/CFO/COO/CTO/CMO/CRO/CSO' },
      { level: 7, label: 'Self Improvement Loop',   desc: 'Hệ thống tự học, tự cải tiến liên tục' },
      { level: 8, label: 'Autonomous Company',      desc: 'Doanh nghiệp tự vận hành hoàn toàn' },
    ];

    let idx = 0;
    if (aiPerformance > 50) idx = 1;
    if (aiPerformance > 65) idx = 2;
    if (aiPerformance > 75 && revenueGrowth > -10) idx = 3;
    if (aiPerformance > 80 && revenueGrowth >= 0) idx = 4;
    if (aiPerformance > 85 && revenueGrowth > 5) idx = 5;
    if (aiPerformance > 90 && revenueGrowth > 10) idx = 6;
    if (aiPerformance > 95 && revenueGrowth > 20) idx = 7;

    const current = LEVELS[idx];
    const next = LEVELS[idx + 1] || null;

    return {
      level: current.level,
      label: current.label,
      desc: current.desc,
      nextLevel: next?.level || null,
      nextLabel: next?.label || null,
      allLevels: LEVELS,
    };
  }
}
