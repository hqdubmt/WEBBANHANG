import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { Workflow } from '../../database/entities/workflow.entity';

@ApiTags('Workflows')
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly service: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách workflows' })
  findAll() { return this.service.findAll(); }

  @Get('active')
  @ApiOperation({ summary: 'Workflows đang hoạt động' })
  active() { return this.service.findActive(); }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê workflows' })
  stats() { return this.service.getStats(); }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết workflow' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Tạo workflow' })
  create(@Body() body: Partial<Workflow>) { return this.service.create(body); }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật workflow' })
  update(@Param('id') id: string, @Body() body: Partial<Workflow>) { return this.service.update(id, body); }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Kích hoạt workflow' })
  activate(@Param('id') id: string) { return this.service.activate(id); }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Tắt workflow' })
  deactivate(@Param('id') id: string) { return this.service.deactivate(id); }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa workflow' })
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
