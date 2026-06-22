import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerAccount } from './entities/seller-account.entity';
import { SellerProduct } from './entities/seller-product.entity';
import { SellerOrder } from './entities/seller-order.entity';
import { TiktokSellerService } from './tiktok-seller.service';
import { LazadaSellerService } from './lazada-seller.service';
import { ShopeeSellerService } from './shopee-seller.service';
import { BrowserSellerService } from './browser-seller.service';
import { SellerCenterController } from './seller-center.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SellerAccount, SellerProduct, SellerOrder]),
  ],
  providers: [TiktokSellerService, LazadaSellerService, ShopeeSellerService, BrowserSellerService],
  controllers: [SellerCenterController],
  exports: [TiktokSellerService, LazadaSellerService, ShopeeSellerService, BrowserSellerService],
})
export class SellerCenterModule {}
