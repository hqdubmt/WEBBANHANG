import { Controller, Get, Post, Body } from '@nestjs/common';
import { SeoAgentService } from './seo-agent.service';

@Controller('agents/seo')
export class SeoAgentController {
  constructor(private readonly service: SeoAgentService) {}

  @Post('run')
  run(@Body('count') count?: number) {
    return this.service.generateDailyArticles(count);
  }

  @Get('drafts')
  drafts() {
    return this.service.getDraftArticles();
  }
}
