import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiMemory } from '../../database/entities/ai-memory.entity';
import { AiMemoryService } from './ai-memory.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiMemory])],
  providers: [AiMemoryService],
  exports: [AiMemoryService],
})
export class AiMemoryModule {}
