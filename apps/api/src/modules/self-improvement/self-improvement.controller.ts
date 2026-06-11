import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { SelfImprovementService } from './self-improvement.service';
import { DecisionArea, DecisionOutcome } from '../../database/entities/decision-memory.entity';
import { ExperimentStatus } from '../../database/entities/experiment.entity';
import { LessonType, LessonDomain } from '../../database/entities/lesson-learned.entity';
import { ScorecardPeriod } from '../../database/entities/performance-scorecard.entity';

@Controller('self-improvement')
export class SelfImprovementController {
  constructor(private readonly svc: SelfImprovementService) {}

  @Get('dashboard')
  getDashboard() { return this.svc.getDashboard(); }

  @Get('observe')
  observe() { return this.svc.observe(); }

  @Get('evaluate')
  evaluate() { return this.svc.evaluate(); }

  @Get('analyze')
  analyzeRootCause() { return this.svc.analyzeRootCause(); }

  @Get('daily-loop')
  getDailyLoop() { return this.svc.getDailyLoop(); }

  @Get('weekly-retrospective')
  getWeeklyRetrospective() { return this.svc.getWeeklyRetrospective(); }

  @Get('monthly-evolution')
  getMonthlyEvolution() { return this.svc.getMonthlyEvolution(); }

  @Get('improvement-plan')
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
}
