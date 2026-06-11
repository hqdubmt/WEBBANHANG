import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CustomerTier } from '../../database/entities/customer.entity';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

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

  @Post(':id/upgrade-vip')
  @ApiOperation({ summary: 'Nâng cấp VIP' })
  upgradeVip(@Param('id') id: string) {
    return this.service.upgradeVip(id);
  }
}
