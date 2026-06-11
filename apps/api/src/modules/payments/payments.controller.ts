import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thanh toán' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.findAll(page, limit);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Thanh toán theo đơn hàng' })
  byOrder(@Param('orderId') id: string) {
    return this.service.findByOrder(id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê thanh toán' })
  stats() {
    return this.service.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết thanh toán' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo giao dịch thanh toán' })
  create(@Body() body: { orderId: string; method: string; amount: number }) {
    return this.service.createPayment(body.orderId, body.method, body.amount);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Xác nhận thanh toán thành công' })
  confirm(@Param('id') id: string, @Body() body: { transactionId?: string; gatewayResponse?: Record<string, any> }) {
    return this.service.confirmPayment(id, body.transactionId, body.gatewayResponse);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Hoàn tiền' })
  refund(@Param('id') id: string, @Body() body: { note?: string }) {
    return this.service.refund(id, body.note);
  }
}
