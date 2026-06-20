import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { TelegramAgentService } from './telegram-agent.service';
import { TelegramAgentController } from './telegram-agent.controller';
import { TelegramBotService } from './telegram-bot.service';
import { ImageGeneratorService } from './image-generator.service';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog])],
  providers: [TelegramAgentService, TelegramBotService, ImageGeneratorService],
  controllers: [TelegramAgentController],
  exports: [TelegramAgentService, TelegramBotService, ImageGeneratorService],
})
export class TelegramAgentModule {}
