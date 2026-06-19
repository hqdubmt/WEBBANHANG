import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CustomerHealthService } from './customer-health.service';
import { RetentionService } from './retention.service';
import { LoyaltyService } from './loyalty.service';
import { CustomerTier } from '../../database/entities/customer.entity';
import { Roles } from '../auth/auth.guard';
import { UserRole } from '../../database/entities/user.entity';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly service: CustomersService,
    private readonly health: CustomerHealthService,
    private readonly retention: RetentionService,
    private readonly loyalty: LoyaltyService,
  ) {}

  // ─── Existing ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Danh sách khách hàng' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('tier') tier?: CustomerTier,
  ) {
    return this.service.findAll({ page, limit, search, tier });
  }

  @Post()
  @ApiOperation({ summary: 'Tạo khách hàng' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê tổng quan khách hàng' })
  stats() {
    return this.retention.getRetentionStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết khách hàng' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật khách hàng' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Xoá khách hàng khỏi hệ thống' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/upgrade-vip')
  @ApiOperation({ summary: 'Nâng cấp VIP thủ công' })
  upgradeVip(@Param('id') id: string) {
    return this.service.upgradeVip(id);
  }

  // ─── EPIC 08 F01: Customer Health ────────────────────────────────────────

  @Get('health/dashboard')
  @ApiOperation({ summary: 'Health Dashboard — tổng quan sức khỏe khách hàng' })
  healthDashboard() {
    return this.health.getHealthDashboard();
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Health Score — RFM score + churn risk của 1 khách' })
  healthScore(@Param('id') id: string) {
    return this.health.calculateHealthScore(id);
  }

  @Post('health/batch-scan')
  @ApiOperation({ summary: 'Health — cập nhật health score hàng loạt' })
  batchHealthScan(@Body('limit') limit?: number) {
    return this.health.batchUpdateHealthScores(limit);
  }

  @Get('health/at-risk')
  @ApiOperation({ summary: 'Risk Detection — danh sách khách hàng nguy cơ rời bỏ' })
  @ApiQuery({ name: 'threshold', required: false })
  atRisk(@Query('threshold') threshold?: number) {
    return this.health.detectAtRisk(threshold);
  }

  // ─── EPIC 08 F02: Retention ───────────────────────────────────────────────

  @Get('retention/inactive')
  @ApiOperation({ summary: 'Retention — khách hàng không hoạt động' })
  @ApiQuery({ name: 'days', required: false })
  inactive(@Query('days') days?: number) {
    return this.retention.getInactiveCustomers(days);
  }

  @Post('retention/follow-up')
  @ApiOperation({ summary: 'Retention — tạo follow-up notifications cho khách inactive' })
  scheduleFollowUps(@Body('daysInactive') days?: number) {
    return this.retention.scheduleFollowUps(days);
  }

  @Post('retention/birthday-reminders')
  @ApiOperation({ summary: 'Retention — gửi chúc mừng sinh nhật hôm nay' })
  birthdayReminders() {
    return this.retention.sendBirthdayReminders();
  }

  @Post('retention/re-engage')
  @ApiOperation({ summary: 'Retention — gửi re-engagement cho khách churn 60+ ngày' })
  reEngage(@Body('daysInactive') days?: number) {
    return this.retention.sendReEngagementReminders(days);
  }

  @Get('retention/stats')
  @ApiOperation({ summary: 'Retention — thống kê notifications' })
  retentionStats() {
    return this.retention.getRetentionStats();
  }

  // ─── EPIC 08 F03: Loyalty ─────────────────────────────────────────────────

  @Get(':id/loyalty')
  @ApiOperation({ summary: 'Loyalty — tóm tắt tier, điểm, coupon của khách' })
  loyaltySummary(@Param('id') id: string) {
    return this.loyalty.getCustomerLoyaltySummary(id);
  }

  @Patch(':id/check-tier')
  @ApiOperation({ summary: 'Loyalty — kiểm tra và nâng tier tự động' })
  checkTier(@Param('id') id: string) {
    return this.loyalty.checkAndUpgradeTier(id);
  }

  @Post('loyalty/batch-tiers')
  @ApiOperation({ summary: 'Loyalty — kiểm tra tier hàng loạt' })
  batchTiers() {
    return this.loyalty.batchCheckTiers();
  }

  @Post(':id/reward-coupon')
  @ApiOperation({ summary: 'Loyalty — phát coupon thưởng theo điểm' })
  awardCoupon(@Param('id') id: string, @Body('points') points: number) {
    return this.loyalty.awardRewardCoupon(id, points);
  }

  @Get('loyalty/perks/:tier')
  @ApiOperation({ summary: 'Loyalty — danh sách quyền lợi theo tier' })
  perks(@Param('tier') tier: CustomerTier) {
    return this.loyalty.getVipPerks(tier);
  }
}
