import { Controller, Get, Post, Query, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/auth.guard';
import { MarketplaceService } from './marketplace.service';
import { LazadaService } from './lazada.service';
import { TiktokService } from './tiktok.service';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly service: MarketplaceService,
    private readonly lazada: LazadaService,
    private readonly tiktok: TiktokService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Kiểm tra platform nào đã cấu hình API key' })
  status() {
    return { configured: this.service.configuredPlatforms };
  }

  @Get('trending')
  @ApiOperation({ summary: 'Sản phẩm trending từ tất cả platform' })
  trending(@Query('limit') limit?: number) {
    return this.service.getTrendingProducts(limit || 50);
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm sản phẩm theo keyword trên tất cả platform' })
  search(@Query('q') keyword: string, @Query('limit') limit?: number) {
    return this.service.searchAllPlatforms([keyword], limit || 10);
  }

  @Post('affiliate-link')
  @ApiOperation({ summary: 'Tạo link affiliate từ URL gốc' })
  generateLink(@Body('url') url: string) {
    return this.service.generateAffiliateFromUrl(url);
  }

  @Post('best-affiliate')
  @ApiOperation({ summary: 'Tìm link affiliate tốt nhất cho tên sản phẩm' })
  bestAffiliate(
    @Body('productName') productName: string,
    @Body('platform') platform?: 'shopee' | 'lazada' | 'tiktok',
  ) {
    return this.service.findBestAffiliateLink(productName, platform);
  }

  // ─── OAuth Callbacks ─────────────────────────────────────────────────────

  @Get('lazada/oauth/callback')
  @Public()
  @ApiOperation({ summary: 'Lazada — OAuth callback, nhận authorization code' })
  @ApiQuery({ name: 'code', required: true })
  async lazadaOAuthCallback(@Query('code') code: string) {
    this.logger.log(`Lazada OAuth callback — code: ${code}`);
    const appKey = process.env.LAZADA_APP_KEY || '';
    const appSecret = process.env.LAZADA_APP_SECRET || '';
    if (!appKey || !appSecret) {
      return { success: false, error: 'LAZADA_APP_KEY / LAZADA_APP_SECRET chưa cấu hình trong .env' };
    }
    try {
      const token = await LazadaService.getAccessToken(appKey, appSecret, code);
      this.logger.log(`Lazada token: ${JSON.stringify(token)}`);
      return { success: true, data: token };
    } catch (e) {
      this.logger.error(`Lazada OAuth lỗi: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  @Get('tiktok/oauth/callback')
  @Public()
  @ApiOperation({ summary: 'TikTok Shop — OAuth callback, nhận authorization code' })
  @ApiQuery({ name: 'code', required: true })
  async tiktokOAuthCallback(@Query('code') code: string) {
    this.logger.log(`TikTok OAuth callback — code: ${code}`);
    const appKey = process.env.TIKTOK_APP_KEY || '';
    const appSecret = process.env.TIKTOK_APP_SECRET || '';
    if (!appKey || !appSecret) {
      return { success: false, error: 'TIKTOK_APP_KEY / TIKTOK_APP_SECRET chưa cấu hình trong .env' };
    }
    try {
      const token = await TiktokService.getAccessToken(appKey, appSecret, code);
      this.logger.log(`TikTok token: ${JSON.stringify(token)}`);
      return { success: true, data: token };
    } catch (e) {
      this.logger.error(`TikTok OAuth lỗi: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  @Get('shopee/oauth/callback')
  @Public()
  @ApiOperation({ summary: 'Shopee — OAuth callback, nhận authorization code + shop_id' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'shop_id', required: true })
  async shopeeOAuthCallback(
    @Query('code') code: string,
    @Query('shop_id') shopId: string,
  ) {
    this.logger.log(`Shopee OAuth callback — code: ${code}, shop_id: ${shopId}`);
    const appId = process.env.SHOPEE_APP_ID || '';
    const secret = process.env.SHOPEE_SECRET || '';
    if (!appId || !secret) {
      return { success: false, error: 'SHOPEE_APP_ID / SHOPEE_SECRET chưa cấu hình trong .env' };
    }
    // Lưu code + shop_id để exchange token (gọi API Shopee getAccessToken)
    return { success: true, code, shopId, message: 'Lưu code này để exchange access token qua Shopee Open API' };
  }
}
