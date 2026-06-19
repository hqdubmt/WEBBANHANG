import { Controller, Get, Post, Query, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/auth.guard';
import { MarketplaceService } from './marketplace.service';
import { LazadaService } from './lazada.service';
import { TiktokService } from './tiktok.service';
import { AccessTradeService } from './accesstrade.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { Roles } from '../auth/auth.guard';
import { UserRole } from '../../database/entities/user.entity';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly service: MarketplaceService,
    private readonly lazada: LazadaService,
    private readonly tiktok: TiktokService,
    private readonly at: AccessTradeService,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
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

  @Get('accesstrade/config')
  @ApiOperation({ summary: 'Kiểm tra cấu hình AccessTrade' })
  atConfig() {
    return this.at.getConfig();
  }

  @Get('accesstrade/me')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Thông tin publisher từ AT API' })
  async atMe() {
    if (!this.at.hasApiKey) {
      return { error: 'Chưa cấu hình ACCESSTRADE_API_KEY trong .env' };
    }
    return this.at.getPublisherInfo();
  }

  @Get('accesstrade/campaigns')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Danh sách campaigns từ AT API' })
  async atCampaigns() {
    if (!this.at.hasApiKey) {
      return { error: 'Chưa cấu hình ACCESSTRADE_API_KEY trong .env' };
    }
    const campaigns = await this.at.getCampaigns();
    return { total: campaigns.length, campaigns };
  }

  @Get('accesstrade/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Thống kê click/conversion từ AT API' })
  async atStats(@Query('from') from?: string, @Query('to') to?: string) {
    if (!this.at.hasApiKey) {
      return { error: 'Chưa cấu hình ACCESSTRADE_API_KEY trong .env' };
    }
    const [clicks, conversions] = await Promise.all([
      this.at.getClickStats(from, to),
      this.at.getConversionStats(from, to),
    ]);
    return { clicks, conversions };
  }

  @Post('accesstrade/test-link')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Test tạo AT tracking link cho 1 URL' })
  async atTestLink(@Body('url') url: string, @Body('campaignId') campaignId?: string) {
    if (!this.at.isConfigured) {
      return { error: 'Chưa cấu hình AccessTrade' };
    }
    return this.at.generateTrackingLink(url, campaignId);
  }

  @Post('accesstrade/migrate-links')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Chuyển toàn bộ link Tiki sang AccessTrade tracking links' })
  async migrateToAccessTradeLinks(@Body('campaignId') campaignId?: string) {
    if (!this.at.isConfigured) {
      return { success: false, message: 'Chưa cấu hình AccessTrade trong .env' };
    }

    // Nếu có API key + không truyền campaignId, tự tìm campaign Tiki
    let resolvedCampaignId = campaignId;
    if (!resolvedCampaignId && this.at.hasApiKey) {
      const tikiCampaign = await this.at.findTikiCampaign();
      if (tikiCampaign) {
        resolvedCampaignId = String(tikiCampaign.id);
        this.logger.log(`Auto-found Tiki campaign: ${tikiCampaign.name} (id=${resolvedCampaignId})`);
      }
    }

    const products = await this.productRepo.find({ where: { source: 'tiki' as any } });
    let updated = 0;
    let apiLinks = 0;
    let deepLinks = 0;

    for (const p of products) {
      let originalUrl: string = p.affiliateLink || '';
      if (originalUrl.includes('accesstrade.vn')) {
        try {
          const u = new URL(originalUrl);
          originalUrl = decodeURIComponent(u.searchParams.get('url') || '');
        } catch { continue; }
      }
      if (!originalUrl.includes('tiki.vn')) continue;

      const result = await this.at.generateTrackingLink(originalUrl, resolvedCampaignId);
      await this.productRepo.update(p.id, {
        affiliateLink: result.trackingUrl,
        commission: this.at.tikiCommission,
      });
      updated++;
      if (result.method === 'api') apiLinks++; else deepLinks++;
    }

    return {
      success: true,
      total: products.length,
      updated,
      apiLinks,
      deepLinks,
      campaignId: resolvedCampaignId || null,
      message: `Đã cập nhật ${updated}/${products.length} sản phẩm (${apiLinks} AT API link, ${deepLinks} deeplink)`,
    };
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
    return { success: true, code, shopId, message: 'Lưu code này để exchange access token qua Shopee Open API' };
  }

}
