import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SelfImprovementService } from './self-improvement.service';
import { PricingTestService } from './pricing-test.service';
import { AutonomousExecutorService } from './autonomous-executor.service';
import { SelfImprovementController } from './self-improvement.controller';
import { Order } from '../../database/entities/order.entity';
import { Lead } from '../../database/entities/lead.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Product } from '../../database/entities/product.entity';
import { AgentLog } from '../../database/entities/agent-log.entity';
import { Content } from '../../database/entities/content.entity';
import { Campaign } from '../../database/entities/campaign.entity';
import { LearningCycle } from '../../database/entities/learning-cycle.entity';
import { LessonLearned } from '../../database/entities/lesson-learned.entity';
import { DecisionMemory } from '../../database/entities/decision-memory.entity';
import { Experiment } from '../../database/entities/experiment.entity';
import { PerformanceScorecard } from '../../database/entities/performance-scorecard.entity';
import { AiDecision } from '../../database/entities/ai-decision.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order, Lead, Customer, Product, AgentLog, Content, Campaign,
      LearningCycle, LessonLearned, DecisionMemory, Experiment, PerformanceScorecard, AiDecision,
    ]),
    AiModule,
  ],
  controllers: [SelfImprovementController],
  providers: [SelfImprovementService, PricingTestService, AutonomousExecutorService],
  exports: [SelfImprovementService, PricingTestService, AutonomousExecutorService],
})
export class SelfImprovementModule {}
