import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard tổng quan' })
  dashboard() {
    return this.service.getDashboard();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Thống kê doanh thu' })
  revenue() {
    return this.service.getRevenueSummary();
  }

  @Get('leads')
  @ApiOperation({ summary: 'Thống kê lead' })
  leads() {
    return this.service.getLeadSummary();
  }

  @Get('customers')
  @ApiOperation({ summary: 'Thống kê khách hàng' })
  customers() {
    return this.service.getCustomerSummary();
  }

  @Get('ai')
  @ApiOperation({ summary: 'Thống kê AI token & chi phí' })
  ai() {
    return this.service.getAiSummary();
  }

  @Get('content')
  @ApiOperation({ summary: 'Thống kê nội dung' })
  content() {
    return this.service.getContentSummary();
  }
}
