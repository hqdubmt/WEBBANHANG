import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderAutomationService } from './order-automation.service';
import { FulfillmentService } from './fulfillment.service';
import { OrderStatus } from '../../database/entities/order.entity';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly automation: OrderAutomationService,
    private readonly fulfillment: FulfillmentService,
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
  revenue(@Query('days') days?: number) {
    return this.service.getRevenueSummary(days);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn hàng' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng' })
  updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.service.updateStatus(id, status);
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
}
