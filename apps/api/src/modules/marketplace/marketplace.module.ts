import { Module } from '@nestjs/common';
import { ShopeeService } from './shopee.service';
import { LazadaService } from './lazada.service';
import { TiktokService } from './tiktok.service';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';

@Module({
  providers: [ShopeeService, LazadaService, TiktokService, MarketplaceService],
  controllers: [MarketplaceController],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
