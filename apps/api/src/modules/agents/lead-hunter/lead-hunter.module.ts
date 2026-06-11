import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { Lead } from '../../../database/entities/lead.entity';
import { AiModule } from '../../ai/ai.module';
import { LeadHunterService } from './lead-hunter.service';
import { LeadHunterController } from './lead-hunter.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog, Lead]), AiModule],
  providers: [LeadHunterService],
  controllers: [LeadHunterController],
  exports: [LeadHunterService],
})
export class LeadHunterModule {}
