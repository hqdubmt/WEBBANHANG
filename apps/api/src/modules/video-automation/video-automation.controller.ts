import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, Req, Res, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../auth/auth.guard';
import { VideoAutomationService } from './video-automation.service';
import { SourceType } from './entities/video-source.entity';

@ApiTags('Video Automation')
@Controller('video-automation')
export class VideoAutomationController {
  constructor(private readonly svc: VideoAutomationService) {}

  // ── Pipeline ──────────────────────────────────────────────────────────────

  @Post('run')
  @ApiOperation({ summary: 'Chạy pipeline AI video thủ công' })
  run(@Body() dto: { count?: number }) {
    return this.svc.runPipeline(dto.count ?? 3);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê tổng / thành công / thất bại' })
  stats() {
    return this.svc.getStats();
  }

  // Ghép storageUrl cho runs cũ chưa có
  @Post('backfill')
  @ApiOperation({ summary: 'Ghép video MinIO với runs cũ chưa có storageUrl' })
  backfill() {
    return this.svc.backfillStorageUrls();
  }

  @Get('runs')
  @ApiOperation({ summary: 'Danh sách lần chạy gần đây' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listRuns(@Query('limit') limit?: string) {
    return this.svc.listRuns(limit ? parseInt(limit) : 20);
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Chi tiết 1 lần chạy' })
  getRun(@Param('id') id: string) {
    return this.svc.getRun(id);
  }

  // Public — stream video từ MinIO qua API (không redirect, không cần port 8080 mở ra ngoài)
  @Public()
  @Get('runs/:id/download')
  @ApiOperation({ summary: 'Tải video (public, stream từ MinIO)' })
  async download(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const run = await this.svc.getRun(id).catch(() => null);
    if (!run?.storageUrl) throw new NotFoundException('Video chưa có trên storage');
    res.setHeader('Content-Disposition', `attachment; filename="video-${id.slice(0, 8)}.mp4"`);
    return this.svc.streamVideo(run.storageUrl, req, res);
  }

  @Public()
  @Get('runs/:id/view')
  @ApiOperation({ summary: 'Xem video trong browser (public, stream từ MinIO)' })
  async view(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const run = await this.svc.getRun(id).catch(() => null);
    if (!run?.storageUrl) throw new NotFoundException('Video chưa có trên storage');
    return this.svc.streamVideo(run.storageUrl, req, res);
  }

  // ── Quản lý nguồn tin ─────────────────────────────────────────────────────

  @Get('sources')
  listSources() { return this.svc.listSources(); }

  @Post('sources')
  createSource(@Body() dto: { name: string; type: SourceType; url?: string; keyword?: string; maxItems?: number }) {
    return this.svc.createSource(dto);
  }

  @Put('sources/:id/toggle')
  toggleSource(@Param('id') id: string) { return this.svc.toggleSource(id); }

  @Delete('sources/:id')
  deleteSource(@Param('id') id: string) { return this.svc.deleteSource(id); }
}
