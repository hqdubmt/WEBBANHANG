import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StrategyEngineService } from './strategy-engine.service';
import { ChannelAllocationService } from './channel-allocation.service';
import { GrowthOpportunitiesService } from './growth-opportunities.service';
import { MarketingGoal } from './strategy-engine.service';

@ApiTags('Marketing Orchestrator')
@Controller('marketing')
export class MarketingOrchestratorController {
  constructor(
    private readonly strategy: StrategyEngineService,
    private readonly channels: ChannelAllocationService,
    private readonly growth: GrowthOpportunitiesService,
  ) {}

  // ─── F01: Strategy Engine ─────────────────────────────────────────────────

  @Post('strategy/generate')
  @ApiOperation({ summary: 'Strategy — tạo chiến lược marketing đầy đủ' })
  generateStrategy(@Body('period') period?: MarketingGoal['period']) {
    return this.strategy.generateStrategy(period);
  }

  @Get('strategy/goals')
  @ApiOperation({ summary: 'Strategy — lập kế hoạch mục tiêu KPI' })
  planGoals(@Query('period') period?: MarketingGoal['period']) {
    return this.strategy.planGoals(period);
  }

  @Get('strategy/audiences')
  @ApiOperation({ summary: 'Strategy — phân tích và lập kế hoạch audience' })
  planAudiences() {
    return this.strategy.planAudiences();
  }

  // ─── F02: Channel Allocation ──────────────────────────────────────────────

  @Post('channels/allocate')
  @ApiOperation({ summary: 'Channel Allocation — phân bổ ngân sách theo kênh' })
  allocate(@Body('budget') budget: number) {
    return this.channels.generateAllocationPlan(budget || 10_000_000);
  }

  @Get('channels/seo')
  @ApiOperation({ summary: 'Channel Allocation — hiệu suất kênh SEO' })
  seoPerformance() {
    return this.channels.getSeoPerformance();
  }

  @Get('channels/content')
  @ApiOperation({ summary: 'Channel Allocation — hiệu suất kênh Content' })
  contentPerformance() {
    return this.channels.getContentPerformance();
  }

  @Get('channels/affiliate')
  @ApiOperation({ summary: 'Channel Allocation — hiệu suất kênh Affiliate' })
  affiliatePerformance() {
    return this.channels.getAffiliatePerformance();
  }

  // ─── F03: Growth Opportunities ────────────────────────────────────────────

  @Get('growth/report')
  @ApiOperation({ summary: 'Growth — báo cáo cơ hội tăng trưởng + quick wins' })
  growthReport() {
    return this.growth.getGrowthReport();
  }

  @Get('growth/trends')
  @ApiOperation({ summary: 'Growth — phát hiện trend thị trường' })
  trends() {
    return this.growth.detectTrends();
  }

  @Get('growth/expansions')
  @ApiOperation({ summary: 'Growth — cơ hội mở rộng thị trường' })
  expansions() {
    return this.growth.identifyExpansions();
  }
}
