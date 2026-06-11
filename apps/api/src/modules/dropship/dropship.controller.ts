import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DropshipService } from './dropship.service';
import { DropshipOrderStatus } from '../../database/entities/dropship-order.entity';

@ApiTags('Dropship')
@Controller('dropship')
export class DropshipController {
  constructor(private readonly svc: DropshipService) {}

  // Products
  @Get('products')
  @ApiOperation({ summary: 'Danh sách sản phẩm dropship' })
  listProducts(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string) {
    return this.svc.listProducts(Number(page), Number(limit), search);
  }

  @Get('products/stats')
  @ApiOperation({ summary: 'Thống kê sản phẩm dropship' })
  statsProducts() {
    return this.svc.statsProducts();
  }

  @Get('products/:id')
  findProduct(@Param('id') id: string) {
    return this.svc.findProduct(id);
  }

  @Post('products')
  @ApiOperation({ summary: 'Thêm sản phẩm dropship' })
  createProduct(@Body() body: any) {
    return this.svc.createProduct(body);
  }

  @Put('products/:id')
  updateProduct(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateProduct(id, body);
  }

  @Delete('products/:id')
  removeProduct(@Param('id') id: string) {
    return this.svc.removeProduct(id);
  }

  // Orders
  @Get('orders')
  @ApiOperation({ summary: 'Danh sách đơn dropship' })
  listOrders(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: DropshipOrderStatus) {
    return this.svc.listOrders(Number(page), Number(limit), status);
  }

  @Get('orders/stats')
  @ApiOperation({ summary: 'Thống kê đơn dropship' })
  statsOrders() {
    return this.svc.statsOrders();
  }

  @Get('orders/:id')
  findOrder(@Param('id') id: string) {
    return this.svc.findOrder(id);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Tạo đơn dropship' })
  createOrder(@Body() body: any) {
    return this.svc.createOrder(body);
  }

  @Put('orders/:id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn dropship' })
  updateOrderStatus(@Param('id') id: string, @Body('status') status: DropshipOrderStatus) {
    return this.svc.updateOrderStatus(id, status);
  }
}
