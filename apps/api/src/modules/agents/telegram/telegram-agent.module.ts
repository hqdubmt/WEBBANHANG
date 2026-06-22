import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { TelegramAgentService } from './telegram-agent.service';
import { TelegramAgentController } from './telegram-agent.controller';
import { TelegramBotService } from './telegram-bot.service';
import { ImageGeneratorService } from './image-generator.service';
import { VideoGeneratorService } from './video-generator.service';
import { TikTokUploaderService } from './tiktok-uploader.service';
import { ZaloPersonalService } from './zalo-personal.service';
import { FacebookGroupsService } from './facebook-groups.service';
import { AiVideoPipelineService } from './ai-video-pipeline.service';
import { AiModule } from '../../ai/ai.module';
import { PriorityBrandsService } from './priority-brands.service';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog]), AiModule],
  providers: [TelegramAgentService, TelegramBotService, ImageGeneratorService, VideoGeneratorService, TikTokUploaderService, ZaloPersonalService, FacebookGroupsService, AiVideoPipelineService, PriorityBrandsService],
  controllers: [TelegramAgentController],
  exports: [TelegramAgentService, TelegramBotService, ImageGeneratorService, VideoGeneratorService, TikTokUploaderService, ZaloPersonalService, FacebookGroupsService, AiVideoPipelineService, PriorityBrandsService],
})
export class TelegramAgentModule {}
