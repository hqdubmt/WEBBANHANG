import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { InventoryTxType } from '../../database/entities/inventory.entity';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Lịch sử tồn kho theo sản phẩm' })
  byProduct(@Param('productId') id: string) {
    return this.service.findByProduct(id);
  }

  @Post('adjust')
  @ApiOperation({ summary: 'Điều chỉnh tồn kho' })
  adjust(@Body() body: {
    productId: string;
    quantity: number;
    txType: InventoryTxType;
    note?: string;
    supplierId?: string;
    unitCost?: number;
  }) {
    return this.service.adjust(body.productId, body.quantity, body.txType, body.note, body.supplierId, body.unitCost);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Sản phẩm gần hết hàng' })
  @ApiQuery({ name: 'threshold', required: false })
  lowStock(@Query('threshold') threshold?: string) {
    return this.service.getLowStock(threshold ? parseInt(threshold) : 10);
  }

  @Get('value')
  @ApiOperation({ summary: 'Tổng giá trị tồn kho' })
  value() {
    return this.service.getInventoryValue();
  }
}
