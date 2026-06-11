import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhiteLabelClient } from '../../../database/entities/white-label-client.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { WhitelabelOnboardingService } from './whitelabel-onboarding.service';
import { WhitelabelOnboardingController } from './whitelabel-onboarding.controller';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([WhiteLabelClient, AgentLog]), AiModule],
  controllers: [WhitelabelOnboardingController],
  providers: [WhitelabelOnboardingService],
  exports: [WhitelabelOnboardingService],
})
export class WhitelabelOnboardingModule {}
