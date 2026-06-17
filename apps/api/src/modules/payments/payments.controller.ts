import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/auth.guard';
import { PaymentsService } from './payments.service';
import { PaymentGatewayService } from './payment-gateway.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly service: PaymentsService,
    private readonly gateway: PaymentGatewayService,
  ) {}

  // ─── Existing ────────────────────────────────────────────────────────────

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

  @Get('methods')
  @ApiOperation({ summary: 'Danh sách phương thức thanh toán hỗ trợ' })
  methods() {
    return {
      methods: [
        { key: 'cod', name: 'Tiền mặt khi nhận hàng (COD)', icon: '💵', enabled: true },
        { key: 'bank_transfer', name: 'Chuyển khoản ngân hàng', icon: '🏦', enabled: true },
        { key: 'momo', name: 'Ví MoMo', icon: '📱', enabled: true },
        { key: 'vnpay', name: 'VNPay', icon: '💳', enabled: true },
        { key: 'zalopay', name: 'ZaloPay', icon: '💙', enabled: true },
        { key: 'credit_card', name: 'Thẻ tín dụng', icon: '💳', enabled: false },
      ],
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Lịch sử thanh toán (alias /payments)' })
  history(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.findAll(page, limit);
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

  // ─── EPIC 07 F02: Payment Gateways ───────────────────────────────────────
  // Static routes MUST be before :id/action routes to avoid NestJS param-match conflict

  @Post('vnpay/create-url')
  @ApiOperation({ summary: 'VNPay — tạo URL thanh toán (HMAC-SHA512)' })
  vnpayCreate(
    @Body() body: {
      orderId: string;
      amount: number;
      orderInfo: string;
      returnUrl: string;
      ipAddr?: string;
    },
  ) {
    return this.gateway.createVnpayUrl(body);
  }

  @Get('vnpay/return')
  @Public()
  @ApiOperation({ summary: 'VNPay — xác thực return URL sau thanh toán' })
  vnpayReturn(@Query() query: Record<string, string>) {
    const valid = this.gateway.verifyVnpayReturn(query);
    return { valid, responseCode: query['vnp_ResponseCode'] };
  }

  @Post('momo/create')
  @ApiOperation({ summary: 'MoMo — tạo payment request (QR + deeplink)' })
  momoCreate(
    @Body() body: {
      orderId: string;
      amount: number;
      orderInfo: string;
      returnUrl: string;
      notifyUrl: string;
    },
  ) {
    return this.gateway.createMomoPayment(body);
  }

  @Post('momo/ipn')
  @Public()
  @ApiOperation({ summary: 'MoMo — nhận IPN (Instant Payment Notification)' })
  momoIpn(@Body() body: Record<string, any>) {
    const valid = this.gateway.verifyMomoIpn(body);
    return { valid };
  }

  @Post('cod/confirm')
  @ApiOperation({ summary: 'COD — xác nhận thu tiền mặt' })
  codConfirm(@Body() body: { orderId: string; amount: number }) {
    const ref = this.gateway.createCodReference(body.orderId);
    return this.service.createPayment(body.orderId, 'cod', body.amount)
      .then((payment) => ({ ...payment, codReference: ref }));
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Xác nhận thanh toán thành công' })
  confirm(
    @Param('id') id: string,
    @Body() body: { transactionId?: string; gatewayResponse?: Record<string, any> },
  ) {
    return this.service.confirmPayment(id, body.transactionId, body.gatewayResponse);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Hoàn tiền' })
  refund(@Param('id') id: string, @Body() body: { note?: string }) {
    return this.service.refund(id, body.note);
  }
}
