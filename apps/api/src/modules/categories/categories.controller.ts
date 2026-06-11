import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Category } from '../../database/entities/category.entity';
import { Public } from '../auth/auth.guard';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Lấy tất cả danh mục' })
  findAll() {
    return this.service.findAll();
  }

  @Get('tree')
  @Public()
  @ApiOperation({ summary: 'Lấy danh mục dạng cây' })
  findTree() {
    return this.service.findTree();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Chi tiết danh mục' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo danh mục' })
  create(@Body() body: Partial<Category>) {
    return this.service.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục' })
  update(@Param('id') id: string, @Body() body: Partial<Category>) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa danh mục' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
