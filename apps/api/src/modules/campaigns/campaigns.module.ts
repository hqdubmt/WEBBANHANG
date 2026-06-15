import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../../database/entities/campaign.entity';
import { Notification } from '../../database/entities/notification.entity';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignSchedulerService } from './campaign-scheduler.service';
import { CampaignDistributionService } from './campaign-distribution.service';
import { CampaignOptimizationService } from './campaign-optimization.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, Notification]), AiModule],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    CampaignSchedulerService,
    CampaignDistributionService,
    CampaignOptimizationService,
  ],
  exports: [CampaignsService, CampaignOptimizationService],
})
export class CampaignsModule {}
