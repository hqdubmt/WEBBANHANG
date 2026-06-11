import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EnterpriseService } from './enterprise.service';
import { Tenant } from '../../database/entities/tenant.entity';

@ApiTags('Enterprise')
@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly svc: EnterpriseService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tenants' })
  findAll() {
    return this.svc.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê enterprise (SLA, churn risk, revenue)' })
  stats() {
    return this.svc.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết tenant' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo tenant mới' })
  create(@Body() dto: Partial<Tenant>) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tenant' })
  update(@Param('id') id: string, @Body() dto: Partial<Tenant>) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/uptime')
  @ApiOperation({ summary: 'Cập nhật uptime SLA' })
  updateUptime(@Param('id') id: string, @Body() body: { uptimePercent: number }) {
    return this.svc.updateUptime(id, body.uptimePercent);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tenant' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
