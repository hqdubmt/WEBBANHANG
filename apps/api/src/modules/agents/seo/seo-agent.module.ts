import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeoArticle } from '../../../database/entities/seo-article.entity';
import { AgentLog } from '../../../database/entities/agent-log.entity';
import { SeoAgentService } from './seo-agent.service';
import { SeoAgentController } from './seo-agent.controller';
import { AiModule } from '../../ai/ai.module';
import { ProductsModule } from '../../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([SeoArticle, AgentLog]), AiModule, ProductsModule],
  controllers: [SeoAgentController],
  providers: [SeoAgentService],
  exports: [SeoAgentService],
})
export class SeoAgentModule {}
