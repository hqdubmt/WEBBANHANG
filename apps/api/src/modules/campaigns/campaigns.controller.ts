import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { Campaign } from '../../database/entities/campaign.entity';

@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chiến dịch' })
  findAll() { return this.service.findAll(); }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê chiến dịch' })
  stats() { return this.service.getStats(); }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết chiến dịch' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Tạo chiến dịch' })
  create(@Body() body: Partial<Campaign>) { return this.service.create(body); }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật chiến dịch' })
  update(@Param('id') id: string, @Body() body: Partial<Campaign>) { return this.service.update(id, body); }

  @Post(':id/launch')
  @ApiOperation({ summary: 'Kích hoạt chiến dịch' })
  launch(@Param('id') id: string) { return this.service.launch(id); }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Hoàn thành chiến dịch' })
  complete(@Param('id') id: string, @Body() body: any) { return this.service.complete(id, body); }

  @Delete(':id')
  @ApiOperation({ summary: 'Hủy chiến dịch' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
