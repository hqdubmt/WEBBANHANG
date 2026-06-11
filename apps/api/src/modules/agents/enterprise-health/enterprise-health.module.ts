import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../../../database/entities/tenant.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { EnterpriseHealthService } from './enterprise-health.service';
import { EnterpriseHealthController } from './enterprise-health.controller';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, AgentLog]), AiModule],
  controllers: [EnterpriseHealthController],
  providers: [EnterpriseHealthService],
  exports: [EnterpriseHealthService],
})
export class EnterpriseHealthModule {}
