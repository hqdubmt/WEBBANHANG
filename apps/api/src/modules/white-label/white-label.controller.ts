import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WhiteLabelService } from './white-label.service';
import { WhiteLabelClient } from '../../database/entities/white-label-client.entity';

@ApiTags('White Label')
@Controller('white-label')
export class WhiteLabelController {
  constructor(private readonly svc: WhiteLabelService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách white label clients' })
  findAll() {
    return this.svc.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê white label (MRR, onboarding, backlog)' })
  stats() {
    return this.svc.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết client' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo white label client mới' })
  create(@Body() dto: Partial<WhiteLabelClient>) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật client' })
  update(@Param('id') id: string, @Body() dto: Partial<WhiteLabelClient>) {
    return this.svc.update(id, dto);
  }

  @Post(':id/complete-onboarding')
  @ApiOperation({ summary: 'Hoàn thành onboarding client' })
  completeOnboarding(@Param('id') id: string) {
    return this.svc.completeOnboarding(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa client' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
