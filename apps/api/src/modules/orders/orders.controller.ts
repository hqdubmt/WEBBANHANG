import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { OrderAutomationService } from './order-automation.service';
import { FulfillmentService } from './fulfillment.service';
import { OrderNotifyService } from './order-notify.service';
import { OrderStatus } from '../../database/entities/order.entity';
import { Notification, NotificationStatus } from '../../database/entities/notification.entity';
import { Roles } from '../auth/auth.guard';
import { UserRole } from '../../database/entities/user.entity';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly automation: OrderAutomationService,
    private readonly fulfillment: FulfillmentService,
    private readonly notify: OrderNotifyService,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
  ) {}

  // ─── Existing ────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Tạo đơn hàng' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách đơn hàng' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.findAll({ page, limit, status, customerId });
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Tổng quan doanh thu' })
  revenue(@Query('days') days?: string) {
    const d = parseInt(days as string, 10);
    return this.service.getRevenueSummary(isNaN(d) || d <= 0 ? 30 : d);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê đơn hàng tổng quan' })
  stats() {
    return this.automation.getOrderStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn hàng' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng (có trừ/hoàn kho tự động)' })
  updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.fulfillment.setStatus(id, status);
  }

  // ─── EPIC 07 F01: Order Management ───────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin đơn hàng (địa chỉ, ghi chú, coupon)' })
  updateOrder(@Param('id') id: string, @Body() body: any) {
    return this.automation.updateOrder(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Huỷ đơn hàng + hoàn kho' })
  cancelOrder(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.automation.cancelOrder(id, reason);
  }

  @Delete(':id/hard')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Xoá vĩnh viễn đơn hàng khỏi hệ thống' })
  hardDeleteOrder(@Param('id') id: string) {
    return this.service.hardDelete(id);
  }

  @Post('bulk/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái hàng loạt' })
  bulkStatus(@Body() body: { orderIds: string[]; status: OrderStatus }) {
    return this.automation.bulkUpdateStatus(body.orderIds, body.status);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Thống kê đơn hàng theo trạng thái + doanh thu hôm nay' })
  orderStats() {
    return this.automation.getOrderStats();
  }

  // ─── EPIC 07 F03: Fulfillment ─────────────────────────────────────────────

  @Patch(':id/advance')
  @ApiOperation({ summary: 'Fulfillment — tiến đơn lên trạng thái kế tiếp (auto flow)' })
  advanceStatus(@Param('id') id: string) {
    return this.fulfillment.advanceStatus(id);
  }

  @Patch(':id/fulfill')
  @ApiOperation({ summary: 'Fulfillment — set trạng thái cụ thể + tracking number' })
  setFulfillment(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus; trackingNumber?: string },
  ) {
    return this.fulfillment.setStatus(id, body.status, body.trackingNumber);
  }

  @Post('fulfillment/auto-deliver')
  @ApiOperation({ summary: 'Fulfillment — tự động mark DELIVERED cho đơn giao quá X ngày' })
  autoDeliver(@Body('daysAgo') daysAgo?: number) {
    return this.fulfillment.autoMarkDelivered(daysAgo);
  }

  @Get('fulfillment/status')
  @ApiOperation({ summary: 'Fulfillment dashboard — tổng quan trạng thái giao hàng' })
  fulfillmentStatus() {
    return this.fulfillment.getFulfillmentStatus();
  }

  // ─── Admin notifications ─────────────────────────────────────────────────

  @Get('notifications/admin')
  @ApiOperation({ summary: 'Lấy thông báo admin (đơn hàng mới, v.v.)' })
  async getAdminNotifications(@Query('limit') limit?: string) {
    const take = Math.min(50, Number(limit) || 20);
    const items = await this.notifRepo.find({
      where: { recipientType: 'admin' },
      order: { createdAt: 'DESC' },
      take,
    });
    const unread = await this.notifRepo.count({
      where: { recipientType: 'admin', status: NotificationStatus.SENT },
    });
    return { items, unread };
  }

  @Patch('notifications/admin/read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo admin đã đọc' })
  async markAllRead() {
    await this.notifRepo
      .createQueryBuilder()
      .update()
      .set({ status: NotificationStatus.READ, readAt: new Date() })
      .where('recipientType = :t AND status = :s', { t: 'admin', s: NotificationStatus.SENT })
      .execute();
    return { ok: true };
  }

  @Post('notify/check-now')
  @ApiOperation({ summary: 'Gửi thông báo Telegram cho tất cả đơn pending 24h' })
  async checkOrdersNow() {
    return this.notify.checkNow();
  }
}
