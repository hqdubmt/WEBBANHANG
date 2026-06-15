import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SelfImprovementService } from './self-improvement.service';
import { PricingTestService } from './pricing-test.service';
import { AutonomousExecutorService } from './autonomous-executor.service';
import { DecisionArea, DecisionOutcome } from '../../database/entities/decision-memory.entity';
import { ExperimentStatus } from '../../database/entities/experiment.entity';
import { LessonType, LessonDomain } from '../../database/entities/lesson-learned.entity';
import { ScorecardPeriod } from '../../database/entities/performance-scorecard.entity';

@ApiTags('Self Improvement')
@Controller('self-improvement')
export class SelfImprovementController {
  constructor(
    private readonly svc: SelfImprovementService,
    private readonly pricing: PricingTestService,
    private readonly executor: AutonomousExecutorService,
  ) {}

  // ─── F01: Learning Loop ───────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Learning Loop — dashboard tổng quan' })
  getDashboard() { return this.svc.getDashboard(); }

  @Get('observe')
  @ApiOperation({ summary: 'Learning Loop — Observe: thu thập KPI thực tế' })
  observe() { return this.svc.observe(); }

  @Get('evaluate')
  @ApiOperation({ summary: 'Learning Loop — Analyze: đánh giá thành công/thất bại' })
  evaluate() { return this.svc.evaluate(); }

  @Get('analyze')
  @ApiOperation({ summary: 'Learning Loop — Analyze: phân tích nguyên nhân gốc rễ' })
  analyzeRootCause() { return this.svc.analyzeRootCause(); }

  @Get('daily-loop')
  @ApiOperation({ summary: 'Learning Loop — vòng lặp hàng ngày (6 câu hỏi)' })
  getDailyLoop() { return this.svc.getDailyLoop(); }

  @Get('weekly-retrospective')
  @ApiOperation({ summary: 'Learning Loop — retrospective hàng tuần' })
  getWeeklyRetrospective() { return this.svc.getWeeklyRetrospective(); }

  @Get('monthly-evolution')
  @ApiOperation({ summary: 'Learning Loop — review tiến hóa hàng tháng' })
  getMonthlyEvolution() { return this.svc.getMonthlyEvolution(); }

  @Get('improvement-plan')
  @ApiOperation({ summary: 'Learning Loop — Learn: xây dựng kế hoạch cải tiến' })
  buildImprovementPlan() { return this.svc.buildImprovementPlan(); }

  // Scorecard
  @Get('scorecard')
  getScorecard(@Query('period') period?: ScorecardPeriod) {
    return this.svc.computeScorecard(period);
  }

  @Get('scorecard/today')
  getTodayScorecard() { return this.svc.getTodayScorecard(); }

  @Get('scorecard/history')
  getScorecardHistory(@Query('period') period?: ScorecardPeriod, @Query('limit') limit?: number) {
    return this.svc.getScorecardHistory(period, limit ? Number(limit) : 30);
  }

  // Decision Memory
  @Get('decisions')
  getDecisions(@Query('area') area?: DecisionArea) { return this.svc.getDecisions(area); }

  @Post('decisions')
  createDecision(@Body() body: {
    decision: string;
    reason: string;
    area: DecisionArea;
    expectedOutcome: string;
    riskLevel?: number;
    madeBy?: string;
  }) { return this.svc.createDecision(body); }

  @Put('decisions/:id/outcome')
  updateDecisionOutcome(
    @Param('id') id: string,
    @Body() body: { actualOutcome: string; outcome: DecisionOutcome; lesson?: string },
  ) { return this.svc.updateDecisionOutcome(id, body.actualOutcome, body.outcome, body.lesson); }

  // Experiments
  @Get('experiments')
  getExperiments(@Query('status') status?: ExperimentStatus) { return this.svc.getExperiments(status); }

  @Post('experiments')
  createExperiment(@Body() body: {
    title: string;
    hypothesis: string;
    experimentPlan?: string;
    scope?: string;
    startDate?: Date;
    endDate?: Date;
  }) { return this.svc.createExperiment(body); }

  @Put('experiments/:id')
  updateExperiment(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateExperiment(id, body);
  }

  // Lessons
  @Get('lessons')
  getLessons(@Query('type') type?: LessonType, @Query('domain') domain?: LessonDomain) {
    return this.svc.getLessons(type, domain);
  }

  @Get('lessons/winning-strategies')
  getWinningStrategies() { return this.svc.getWinningStrategies(); }

  @Get('lessons/failed-strategies')
  getFailedStrategies() { return this.svc.getFailedStrategies(); }

  @Get('lessons/proven-patterns')
  getProvenPatterns() { return this.svc.getProvenPatterns(); }

  // ─── EPIC 15 F02: Pricing Tests ───────────────────────────────────────────

  @Post('pricing-test/start')
  @ApiOperation({ summary: 'Pricing Test — bắt đầu A/B test giá' })
  startPricingTest(@Body() dto: {
    productId: string;
    priceChangePct: number;
    durationDays?: number;
  }) { return this.pricing.startPricingTest(dto); }

  @Post('pricing-test/:experimentId/evaluate')
  @ApiOperation({ summary: 'Pricing Test — kết luận và apply kết quả' })
  evaluatePricingTest(@Param('experimentId') experimentId: string) {
    return this.pricing.evaluatePricingTest(experimentId);
  }

  @Get('pricing-test/suggest/:productId')
  @ApiOperation({ summary: 'Pricing Test — AI đề xuất giá tối ưu' })
  suggestOptimalPrice(@Param('productId') productId: string) {
    return this.pricing.suggestOptimalPrice(productId);
  }

  @Get('pricing-test/active')
  @ApiOperation({ summary: 'Pricing Test — danh sách test đang chạy' })
  listActiveTests() { return this.pricing.listActiveTests(); }

  // ─── EPIC 15 F03: Autonomous Execution ───────────────────────────────────

  @Post('autonomous/run')
  @ApiOperation({ summary: 'Autonomous Execution — chạy full autonomous cycle' })
  runAutonomousCycle() { return this.executor.runAutonomousCycle(); }

  @Post('autonomous/auto-decisions')
  @ApiOperation({ summary: 'Autonomous Execution — chỉ chạy auto decisions' })
  runAutoDecisions() { return this.executor.runAutoDecisions(); }

  @Post('autonomous/auto-optimize')
  @ApiOperation({ summary: 'Autonomous Execution — chỉ chạy auto optimization' })
  runAutoOptimization() { return this.executor.runAutoOptimization(); }

  @Get('autonomous/pending')
  @ApiOperation({ summary: 'Autonomous Execution — danh sách quyết định chờ duyệt' })
  getPendingDecisions() { return this.executor.getPendingDecisions(); }

  @Post('autonomous/decisions/:id/approve')
  @ApiOperation({ summary: 'Autonomous Execution — duyệt quyết định AI' })
  approveDecision(@Param('id') id: string) { return this.executor.approveDecision(id); }

  @Post('autonomous/decisions/:id/reject')
  @ApiOperation({ summary: 'Autonomous Execution — từ chối quyết định AI' })
  rejectDecision(@Param('id') id: string) { return this.executor.rejectDecision(id); }
}
