import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { LeadPlatform, LeadStatus } from '../../database/entities/lead.entity';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo lead mới' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách lead' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('platform') platform?: LeadPlatform,
    @Query('status') status?: LeadStatus,
  ) {
    return this.service.findAll({ page, limit, platform, status });
  }

  @Get('hot')
  @ApiOperation({ summary: 'Lead có điểm cao (cần xử lý ngay)' })
  getHot(@Query('minScore') minScore?: number) {
    return this.service.getHighScoreLeads(minScore);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái lead' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: LeadStatus,
    @Body('customerId') customerId?: string,
  ) {
    return this.service.updateStatus(id, status, customerId);
  }
}
