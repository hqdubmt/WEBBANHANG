import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderStatus } from '../../database/entities/order.entity';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

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
}
