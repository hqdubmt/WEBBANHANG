import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiMemory } from '../../database/entities/ai-memory.entity';
import { Order } from '../../database/entities/order.entity';
import { Lead } from '../../database/entities/lead.entity';
import { Customer } from '../../database/entities/customer.entity';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';
import { KnowledgeBrainModule } from '../knowledge-brain/knowledge-brain.module';
import { ChatService } from './chat.service';
import { AdminAssistantService } from './admin-assistant.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiMemory, Order, Lead, Customer]),
    AiModule,
    RagModule,
    KnowledgeBrainModule,
  ],
  providers: [ChatService, AdminAssistantService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
