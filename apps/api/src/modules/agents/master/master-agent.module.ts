import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { MasterAgentService } from './master-agent.service';
import { MasterAgentController } from './master-agent.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AgentLog])],
  controllers: [MasterAgentController],
  providers: [MasterAgentService],
  exports: [MasterAgentService],
})
export class MasterAgentModule {}
