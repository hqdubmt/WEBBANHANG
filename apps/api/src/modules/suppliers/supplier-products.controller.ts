import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SupplierProductsService } from './supplier-products.service';

@ApiTags('Supplier Products')
@Controller('supplier-products')
export class SupplierProductsController {
  constructor(private readonly svc: SupplierProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm từ nhà cung cấp' })
  list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('supplierId') supplierId?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.list(Number(page), Number(limit), supplierId, search);
  }

  @Get('by-supplier/:supplierId')
  @ApiOperation({ summary: 'Sản phẩm theo nhà cung cấp' })
  bySupplier(@Param('supplierId') supplierId: string) {
    return this.svc.bySupplier(supplierId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm sản phẩm nhà cung cấp' })
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
