import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { KnowledgeBrainService } from './knowledge-brain.service';
import { KnowledgeDomain, KnowledgeTier } from '../../database/entities/knowledge.entity';

@ApiTags('Knowledge Brain')
@Controller('knowledge-brain')
export class KnowledgeBrainController {
  constructor(private readonly service: KnowledgeBrainService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Knowledge Brain — tổng quan 5 miền tri thức' })
  dashboard() {
    return this.service.getDashboard();
  }

  @Get('product-intelligence')
  @ApiOperation({ summary: 'Product Intelligence — sản phẩm bán chạy, lợi nhuận cao' })
  productIntelligence() {
    return this.service.getProductIntelligence();
  }

  @Get('customer-intelligence')
  @ApiOperation({ summary: 'Customer Intelligence — khách giá trị cao, rủi ro rời bỏ' })
  customerIntelligence() {
    return this.service.getCustomerIntelligence();
  }

  @Get('business-intelligence')
  @ApiOperation({ summary: 'Business Intelligence — doanh thu, chuyển đổi, tăng trưởng' })
  businessIntelligence() {
    return this.service.getBusinessIntelligence();
  }

  @Get('market-intelligence')
  @ApiOperation({ summary: 'Market Intelligence — xu hướng thị trường, cảnh báo giá' })
  marketIntelligence() {
    return this.service.getMarketIntelligence();
  }

  @Get('operational-intelligence')
  @ApiOperation({ summary: 'Operational Intelligence — sức khỏe hệ thống, hiệu suất agent' })
  operationalIntelligence() {
    return this.service.getOperationalIntelligence();
  }

  @Get('executive-questions')
  @ApiOperation({ summary: '8 câu hỏi chiến lược — Executive AI phải trả lời được' })
  executiveQuestions() {
    return this.service.getExecutiveQuestions();
  }

  @Post('ask')
  @ApiOperation({ summary: 'Hỏi Knowledge Brain bất kỳ câu hỏi kinh doanh' })
  ask(
    @Body() body: { question: string; domains?: KnowledgeDomain[] },
  ) {
    return this.service.ask(body.question, body.domains);
  }

  @Post('ingest')
  @ApiOperation({ summary: 'Nạp tri thức mới vào Knowledge Brain' })
  ingest(
    @Body() body: {
      domain: KnowledgeDomain;
      title: string;
      content: string;
      tier?: KnowledgeTier;
      accuracy?: number;
      completeness?: number;
      businessValue?: number;
      tags?: string[];
      sourceId?: string;
    },
  ) {
    return this.service.ingestKnowledge(body);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê Knowledge Brain — số lượng, chất lượng, phủ sóng' })
  stats() {
    return this.service.getKnowledgeStats();
  }
}
