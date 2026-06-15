import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from '../../database/entities/content.entity';
import { AgentLog } from '../../database/entities/agent-log.entity';
import { ContentFactoryService } from './content-factory.service';
import { VideoGenerationService } from './video-generation.service';
import { LandingPageService } from './landing-page.service';
import { ContentFactoryController } from './content-factory.controller';
import { AiModule } from '../ai/ai.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([Content, AgentLog]), AiModule, ProductsModule],
  controllers: [ContentFactoryController],
  providers: [ContentFactoryService, VideoGenerationService, LandingPageService],
  exports: [ContentFactoryService, VideoGenerationService, LandingPageService],
})
export class ContentFactoryModule {}
