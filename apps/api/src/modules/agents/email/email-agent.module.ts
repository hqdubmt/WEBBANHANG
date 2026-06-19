import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailCampaign } from '../../../database/entities/email-campaign.entity';
import { Customer } from '../../../database/entities/customer.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { EmailAgentService } from './email-agent.service';
import { EmailAgentController } from './email-agent.controller';
import { AiModule } from '../../ai/ai.module';
import { ProductsModule } from '../../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmailCampaign, Customer, AgentLog]), AiModule, ProductsModule],
  providers: [EmailAgentService],
  controllers: [EmailAgentController],
  exports: [EmailAgentService],
})
export class EmailAgentModule {}
