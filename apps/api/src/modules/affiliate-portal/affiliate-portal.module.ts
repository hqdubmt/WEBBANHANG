import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AffiliatePartner } from '../../database/entities/affiliate-partner.entity';
import { AffiliateClick } from '../../database/entities/affiliate-click.entity';
import { AffiliateConversion } from '../../database/entities/affiliate-conversion.entity';
import { AffiliatePortalController } from './affiliate-portal.controller';
import { AffiliatePortalService } from './affiliate-portal.service';

@Module({
  imports: [TypeOrmModule.forFeature([AffiliatePartner, AffiliateClick, AffiliateConversion])],
  controllers: [AffiliatePortalController],
  providers: [AffiliatePortalService],
  exports: [AffiliatePortalService],
})
export class AffiliatePortalModule {}
