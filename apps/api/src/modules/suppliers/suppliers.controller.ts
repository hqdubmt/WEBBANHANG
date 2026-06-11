import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { Supplier } from '../../database/entities/supplier.entity';

@ApiTags('Suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nhà cung cấp' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nhà cung cấp' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Thêm nhà cung cấp' })
  create(@Body() body: Partial<Supplier>) { return this.service.create(body); }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật nhà cung cấp' })
  update(@Param('id') id: string, @Body() body: Partial<Supplier>) { return this.service.update(id, body); }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nhà cung cấp' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
