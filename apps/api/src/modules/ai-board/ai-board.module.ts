import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../database/entities/order.entity';
import { Lead } from '../../database/entities/lead.entity';
import { Customer } from '../../database/entities/customer.entity';
import { AgentLog } from '../../database/entities/agent-log.entity';
import { Content } from '../../database/entities/content.entity';
import { Product } from '../../database/entities/product.entity';
import { Campaign } from '../../database/entities/campaign.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { WhiteLabelClient } from '../../database/entities/white-label-client.entity';
import { MarketplaceVendor } from '../../database/entities/marketplace-vendor.entity';
import { MobileSession } from '../../database/entities/mobile-session.entity';
import { AiBoardService } from './ai-board.service';
import { AiBoardController } from './ai-board.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order, Lead, Customer, AgentLog, Content, Product,
      Campaign, Tenant, WhiteLabelClient, MarketplaceVendor, MobileSession,
    ]),
  ],
  controllers: [AiBoardController],
  providers: [AiBoardService],
  exports: [AiBoardService],
})
export class AiBoardModule {}
