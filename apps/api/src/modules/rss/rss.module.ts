import { Module } from '@nestjs/common';
import { RssService } from './rss.service';
import { RssController } from './rss.controller';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [MarketplaceModule],
  providers: [RssService],
  controllers: [RssController],
})
export class RssModule {}
