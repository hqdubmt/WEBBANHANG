import { Controller, Get, Post, Put, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/auth.guard';
import { LeadsService } from './leads.service';
import { LeadCaptureService, FormLeadDto, InboxLeadDto, CommentLeadDto } from './lead-capture.service';
import { LeadClassifierService } from './lead-classifier.service';
import { LeadRoutingService } from './lead-routing.service';
import { LeadPlatform, LeadStatus } from '../../database/entities/lead.entity';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly service: LeadsService,
    private readonly capture: LeadCaptureService,
    private readonly classifier: LeadClassifierService,
    private readonly routing: LeadRoutingService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo lead thủ công' })
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

  // ─── EPIC 05 F01: Lead Sources ──────────────────────────────────────────

  @Post('capture/form')
  @Public()
  @ApiOperation({ summary: 'Lead Capture — từ form website' })
  captureForm(@Body() dto: FormLeadDto) {
    return this.capture.captureFromForm(dto);
  }

  @Post('capture/inbox')
  @ApiOperation({ summary: 'Lead Capture — từ Omnichannel Inbox' })
  captureInbox(@Body() dto: InboxLeadDto) {
    return this.capture.captureFromInbox(dto);
  }

  @Post('capture/comment')
  @ApiOperation({ summary: 'Lead Capture — từ comment mạng xã hội' })
  captureComment(@Body() dto: CommentLeadDto) {
    return this.capture.captureFromComment(dto);
  }

  // ─── EPIC 05 F02: Lead Classification ───────────────────────────────────

  @Post(':id/classify')
  @ApiOperation({ summary: 'Lead Classification — phân loại 1 lead bằng AI' })
  classifyOne(@Param('id') id: string) {
    return this.classifier.classifyLead(id);
  }

  @Post('classify/batch')
  @ApiOperation({ summary: 'Lead Classification — batch phân loại leads mới (tối đa 20)' })
  classifyBatch(@Body('limit') limit?: number) {
    return this.classifier.classifyNewLeads(limit);
  }

  // ─── EPIC 05 F03: Lead Routing ───────────────────────────────────────────

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Lead Routing — phân công nhân viên (hoặc auto round-robin)' })
  assign(@Param('id') id: string, @Body('agentId') agentId?: string) {
    return this.routing.assignLead(id, agentId);
  }

  @Post('routing/auto')
  @ApiOperation({ summary: 'Lead Routing — tự động phân công tất cả lead score cao' })
  autoRoute(@Body('minScore') minScore?: number) {
    return this.routing.autoRoute(minScore);
  }

  @Post(':id/sync-crm')
  @ApiOperation({ summary: 'CRM Sync — chuyển lead thành Customer' })
  syncCrm(@Param('id') id: string) {
    return this.routing.syncToCustomer(id);
  }

  @Post('crm/batch-sync')
  @ApiOperation({ summary: 'CRM Sync — đồng bộ hàng loạt leads sang Customer' })
  batchSync() {
    return this.routing.batchSyncToCrm();
  }

  @Get('routing/stats')
  @ApiOperation({ summary: 'Lead Routing — thống kê phân công' })
  routingStats() {
    return this.routing.getRoutingStats();
  }
}
