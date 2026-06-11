import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { KnowledgeType } from '../../../database/entities/knowledge.entity';

@ApiTags('Agents')
@Controller('agents/knowledge')
export class KnowledgeAgentController {
  constructor(private readonly service: KnowledgeAgentService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Đồng bộ Knowledge Base lên Qdrant' })
  sync() {
    return this.service.syncKnowledgeBase();
  }

  @Post('add')
  @ApiOperation({ summary: 'Thêm tài liệu vào knowledge base' })
  add(@Body() body: { type: KnowledgeType; title: string; content: string; sourceId?: string; tags?: string[] }) {
    return this.service.addKnowledge(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm trong knowledge base (RAG)' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', required: false, enum: KnowledgeType })
  search(@Query('q') query: string, @Query('type') type?: KnowledgeType) {
    return this.service.search(query, type);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê knowledge base' })
  stats() {
    return this.service.getStats();
  }
}
