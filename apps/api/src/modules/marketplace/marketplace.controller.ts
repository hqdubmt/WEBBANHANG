import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly service: MarketplaceService) {}

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
}
