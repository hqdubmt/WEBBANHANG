import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CampaignSchedulerService } from './campaign-scheduler.service';
import { CampaignDistributionService } from './campaign-distribution.service';
import { CampaignOptimizationService } from './campaign-optimization.service';
import { Campaign } from '../../database/entities/campaign.entity';

@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly service: CampaignsService,
    private readonly scheduler: CampaignSchedulerService,
    private readonly distribution: CampaignDistributionService,
    private readonly optimization: CampaignOptimizationService,
  ) {}

  // ─── Existing CRUD ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Danh sách chiến dịch' })
  findAll() { return this.service.findAll(); }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê chiến dịch' })
  stats() { return this.service.getStats(); }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết chiến dịch' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Tạo chiến dịch' })
  create(@Body() body: Partial<Campaign>) { return this.service.create(body); }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật chiến dịch' })
  update(@Param('id') id: string, @Body() body: Partial<Campaign>) { return this.service.update(id, body); }

  @Post(':id/launch')
  @ApiOperation({ summary: 'Kích hoạt chiến dịch ngay lập tức' })
  launch(@Param('id') id: string) { return this.service.launch(id); }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Hoàn thành chiến dịch + cập nhật stats' })
  complete(@Param('id') id: string, @Body() body: any) { return this.service.complete(id, body); }

  @Delete(':id')
  @ApiOperation({ summary: 'Hủy chiến dịch' })
  remove(@Param('id') id: string) { return this.service.remove(id); }

  // ─── EPIC 11 F01: Scheduling ──────────────────────────────────────────────

  @Post(':id/schedule')
  @ApiOperation({ summary: 'Scheduling — lên lịch chạy tự động' })
  schedule(@Param('id') id: string, @Body('scheduledAt') scheduledAt: string) {
    const date = new Date(scheduledAt);
    if (!scheduledAt || isNaN(date.getTime())) {
      throw new BadRequestException('scheduledAt phải là ISO date string hợp lệ');
    }
    return this.scheduler.scheduleCampaign(id, date);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Scheduling — tạm dừng chiến dịch' })
  pause(@Param('id') id: string) { return this.scheduler.pauseCampaign(id); }

  @Patch(':id/resume')
  @ApiOperation({ summary: 'Scheduling — tiếp tục chiến dịch đã tạm dừng' })
  resume(@Param('id') id: string) { return this.scheduler.resumeCampaign(id); }

  @Get('schedule/queue')
  @ApiOperation({ summary: 'Scheduling — danh sách chiến dịch đang chờ chạy' })
  scheduledQueue() { return this.scheduler.getScheduledCampaigns(); }

  // ─── EPIC 11 F02: Distribution ────────────────────────────────────────────

  @Post(':id/distribute')
  @ApiOperation({ summary: 'Distribution — phát tán lên kênh (FB, Telegram, push, SMS)' })
  distribute(@Param('id') id: string) { return this.distribution.distribute(id); }

  // ─── EPIC 11 F03: Optimization ───────────────────────────────────────────

  @Get(':id/performance')
  @ApiOperation({ summary: 'Optimization — phân tích hiệu suất + AI suggestion' })
  performance(@Param('id') id: string) { return this.optimization.analyzePerformance(id); }

  @Post(':id/ab-test')
  @ApiOperation({ summary: 'Optimization — tạo variant B cho A/B test' })
  createAbTest(@Param('id') id: string, @Body() body: { variantContent: string; splitPercent?: number }) {
    return this.optimization.createAbTest({ campaignId: id, ...body });
  }

  @Get('ab-test/compare')
  @ApiOperation({ summary: 'Optimization — so sánh kết quả A/B test' })
  compareAbTest(@Query('a') originalId: string, @Query('b') variantId: string) {
    return this.optimization.compareAbTest(originalId, variantId);
  }

  @Get('optimization/report')
  @ApiOperation({ summary: 'Optimization — báo cáo tổng quan tối ưu hóa' })
  optimizationReport() { return this.optimization.getOptimizationReport(); }
}
