import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { TelegramAgentService } from './telegram-agent.service';
import { TelegramAgentController } from './telegram-agent.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog])],
  providers: [TelegramAgentService],
  controllers: [TelegramAgentController],
  exports: [TelegramAgentService],
})
export class TelegramAgentModule {}
