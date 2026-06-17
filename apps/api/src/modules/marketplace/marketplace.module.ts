import { Module } from '@nestjs/common';
import { ShopeeService } from './shopee.service';
import { LazadaService } from './lazada.service';
import { TiktokService } from './tiktok.service';
import { TikiService } from './tiki.service';
import { ShopeeScraperService } from './shopee-scraper.service';
import { LazadaScraperService } from './lazada-scraper.service';
import { TikTokScraperService } from './tiktok-scraper.service';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';

@Module({
  providers: [
    ShopeeService, LazadaService, TiktokService,
    TikiService, ShopeeScraperService, LazadaScraperService, TikTokScraperService,
    MarketplaceService,
  ],
  controllers: [MarketplaceController],
  exports: [MarketplaceService, TikiService, ShopeeScraperService, LazadaScraperService, TikTokScraperService],
})
export class MarketplaceModule {}
