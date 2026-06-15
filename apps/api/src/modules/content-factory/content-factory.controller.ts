import {
  Controller, Get, Post, Patch, Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ContentFactoryService } from './content-factory.service';
import { VideoGenerationService } from './video-generation.service';
import { LandingPageService } from './landing-page.service';
import { ContentPlatform } from '../../database/entities/content.entity';

@ApiTags('Content Factory')
@Controller('content')
export class ContentFactoryController {
  constructor(
    private readonly factory: ContentFactoryService,
    private readonly video: VideoGenerationService,
    private readonly landingPage: LandingPageService,
  ) {}

  // ─── F01: Text Generation ─────────────────────────────────────────────────

  @Post('generate/text')
  @ApiOperation({ summary: 'Text Gen — tạo nội dung cho 1 sản phẩm + nền tảng' })
  generateText(
    @Body() dto: {
      productId: string;
      platforms?: ContentPlatform[];
      topic?: string;
    },
  ) {
    const plan = (dto.platforms ?? [ContentPlatform.FACEBOOK, ContentPlatform.TELEGRAM, ContentPlatform.WEBSITE])
      .map((platform) => ({ platform, count: 1, topic: dto.topic || 'sản phẩm hot' }));
    return this.factory.executePipeline(plan as any);
  }

  @Post('generate/batch')
  @ApiOperation({ summary: 'Text Gen — chạy full content pipeline tất cả nền tảng' })
  runBatch() {
    return this.factory.executePipeline();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Text Gen — thống kê nội dung theo nền tảng & trạng thái' })
  stats() {
    return this.factory.getContentStats();
  }

  // ─── F02: Video Generation ────────────────────────────────────────────────

  @Post('video/script')
  @ApiOperation({ summary: 'Video Gen — tạo kịch bản + voice-over + render pipeline' })
  generateVideoScript(
    @Body() dto: {
      productId: string;
      style?: 'tiktok_60s' | 'reels_30s' | 'youtube_short';
    },
  ) {
    return this.video.generateScript(dto.productId, dto.style);
  }

  @Get('video/jobs')
  @ApiOperation({ summary: 'Video Gen — danh sách video jobs' })
  listJobs() {
    return this.video.listJobs();
  }

  @Get('video/jobs/:jobId')
  @ApiOperation({ summary: 'Video Gen — trạng thái 1 video job' })
  getJob(@Param('jobId') jobId: string) {
    return this.video.getJob(jobId);
  }

  // ─── F03: Landing Page Generation ────────────────────────────────────────

  @Post('landing-page/product/:productId')
  @ApiOperation({ summary: 'Landing Page — tạo product page SEO' })
  generateProductPage(@Param('productId') productId: string) {
    return this.landingPage.generateProductPage(productId);
  }

  @Post('landing-page/campaign')
  @ApiOperation({ summary: 'Landing Page — tạo campaign page với urgency/countdown' })
  generateCampaignPage(
    @Body() dto: {
      campaignName: string;
      goal: string;
      productIds?: string[];
      discount?: string;
      endDate?: string;
    },
  ) {
    return this.landingPage.generateCampaignPage(dto);
  }

  @Get('landing-page')
  @ApiOperation({ summary: 'Landing Page — danh sách các trang đã tạo' })
  listLandingPages() {
    return this.landingPage.listLandingPages();
  }
}
