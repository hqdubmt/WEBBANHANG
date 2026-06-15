import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { KnowledgeBrainService } from './knowledge-brain.service';
import { KnowledgeDomain, KnowledgeTier } from '../../database/entities/knowledge.entity';
import { DbDiscoveryService } from './db-discovery.service';
import { ApiDiscoveryService } from './api-discovery.service';

@ApiTags('Knowledge Brain')
@Controller('knowledge-brain')
export class KnowledgeBrainController {
  constructor(
    private readonly service: KnowledgeBrainService,
    private readonly dbDiscovery: DbDiscoveryService,
    private readonly apiDiscovery: ApiDiscoveryService,
  ) {}

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

  // ─── EPIC 02 F01: Database Discovery ──────────────────────────────────────

  @Get('db/tables')
  @ApiOperation({ summary: 'Database Discovery — liệt kê tất cả bảng trong public schema' })
  dbTables() {
    return this.dbDiscovery.scanTables();
  }

  @Get('db/relationships')
  @ApiOperation({ summary: 'Database Discovery — tất cả quan hệ FK giữa các bảng' })
  dbRelationships() {
    return this.dbDiscovery.scanRelationships();
  }

  @Get('db/metadata')
  @ApiOperation({ summary: 'Database Discovery — metadata registry đầy đủ + knowledge graph' })
  dbMetadata() {
    return this.dbDiscovery.getMetadataRegistry();
  }

  @Get('db/table/:name')
  @ApiOperation({ summary: 'Database Discovery — chi tiết 1 bảng (columns + indexes)' })
  dbTableDetail(@Param('name') name: string) {
    return this.dbDiscovery.getTableDetail(name);
  }

  // ─── EPIC 02 F02: API Discovery ────────────────────────────────────────────

  @Get('api/catalog')
  @ApiOperation({ summary: 'API Discovery — catalog đầy đủ theo nhóm prefix' })
  apiCatalog() {
    return this.apiDiscovery.getEndpointCatalog();
  }

  @Get('api/registry')
  @ApiOperation({ summary: 'API Discovery — danh sách tất cả endpoints đã đăng ký' })
  apiRegistry() {
    return this.apiDiscovery.getEndpointRegistry();
  }

  @Get('api/search/:query')
  @ApiOperation({ summary: 'API Discovery — tìm kiếm endpoint theo path hoặc method' })
  apiSearch(@Param('query') query: string) {
    return this.apiDiscovery.searchEndpoints(query);
  }
}
