import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BrandsService } from './brands.service';
import { Brand } from '../../database/entities/brand.entity';
import { Public } from '../auth/auth.guard';

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Danh sách thương hiệu' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Chi tiết thương hiệu' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Tạo thương hiệu' })
  create(@Body() body: Partial<Brand>) { return this.service.create(body); }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thương hiệu' })
  update(@Param('id') id: string, @Body() body: Partial<Brand>) { return this.service.update(id, body); }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thương hiệu' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
