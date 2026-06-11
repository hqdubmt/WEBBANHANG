import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MobileSession } from '../../../database/entities/mobile-session.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { MobileEngagementService } from './mobile-engagement.service';
import { MobileEngagementController } from './mobile-engagement.controller';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([MobileSession, AgentLog]), AiModule],
  controllers: [MobileEngagementController],
  providers: [MobileEngagementService],
  exports: [MobileEngagementService],
})
export class MobileEngagementModule {}
