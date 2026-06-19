import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/auth.guard';
import { StorefrontService, CheckoutDto } from './storefront.service';
import { PaymentGatewayService } from '../payments/payment-gateway.service';

@ApiTags('Storefront')
@Controller('storefront')
export class StorefrontController {
  constructor(
    private readonly service: StorefrontService,
    private readonly gateway: PaymentGatewayService,
  ) {}

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Danh sách sản phẩm (public)' })
  listProducts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.service.listProducts({ page, limit, search, category });
  }

  @Public()
  @Get('products/:id')
  @ApiOperation({ summary: 'Chi tiết sản phẩm + sản phẩm liên quan (public)' })
  getProduct(@Param('id') id: string) {
    return this.service.getProduct(id);
  }

  @Public()
  @Get('affiliate/products')
  @ApiOperation({ summary: 'Sản phẩm affiliate (Tiki/Shopee) cho trang deal — chỉ dùng redirect AT link' })
  listAffiliateProducts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
  ) {
    return this.service.listAffiliateProducts({ page, limit, category });
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Danh sách danh mục (public)' })
  listCategories() {
    return this.service.listCategories();
  }

  @Public()
  @Get('bank-info')
  @ApiOperation({ summary: 'Thông tin tài khoản ngân hàng (public)' })
  bankInfo(@Query('amount') amount?: string, @Query('orderCode') orderCode?: string) {
    return this.gateway.getBankTransferInfo(Number(amount) || 0, orderCode || '');
  }

  @Public()
  @Post('checkout')
  @ApiOperation({ summary: 'Đặt hàng (guest checkout, tự động tạo lead)' })
  checkout(@Body() dto: CheckoutDto) {
    return this.service.checkout(dto);
  }

  @Public()
  @Get('track')
  @ApiOperation({ summary: 'Theo dõi đơn hàng bằng SĐT' })
  track(
    @Query('phone') phone: string,
    @Query('orderCode') orderCode?: string,
  ) {
    return this.service.trackOrder(phone, orderCode);
  }

  @Public()
  @Post('cancel')
  @ApiOperation({ summary: 'Khách tự huỷ đơn (chỉ khi pending)' })
  async cancelOrder(@Body() body: { phone: string; orderCode: string }) {
    try {
      return await this.service.cancelOrder(body.phone, body.orderCode);
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
}
