import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/auth.guard';
import { ProductDiscoveryService, ProductSearchOptions } from './product-discovery.service';
import { SalesConversationService } from './sales-conversation.service';
import { RecommendationService } from './recommendation.service';
import { LeadPlatform } from '../../database/entities/lead.entity';

@ApiTags('Sales Engine')
@Controller('sales')
export class SalesController {
  constructor(
    private readonly discovery: ProductDiscoveryService,
    private readonly conversation: SalesConversationService,
    private readonly recommendation: RecommendationService,
  ) {}

  // ─── F01: Product Discovery ───────────────────────────────────────────────

  @Get('products/search')
  @ApiOperation({ summary: 'Product Discovery — tìm sản phẩm (semantic + keyword)' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'limit', required: false })
  searchProducts(@Query() opts: ProductSearchOptions) {
    return this.discovery.search(opts);
  }

  @Get('products/ranked')
  @ApiOperation({ summary: 'Product Discovery — bảng xếp hạng sản phẩm (trend + doanh số + margin)' })
  @ApiQuery({ name: 'limit', required: false })
  getRanked(@Query('limit') limit?: number) {
    return this.discovery.getRankedProducts(limit);
  }

  @Get('products/category/:category')
  @ApiOperation({ summary: 'Product Discovery — sản phẩm theo danh mục' })
  getByCategory(@Param('category') category: string, @Query('limit') limit?: number) {
    return this.discovery.getByCategory(category, limit);
  }

  // ─── F02: Sales Conversation ──────────────────────────────────────────────

  @Post('conversation/session')
  @Public()
  @ApiOperation({ summary: 'Sales Conversation — tạo session bán hàng' })
  createSession(
    @Body() body: { platform?: LeadPlatform; customerName?: string },
  ) {
    const session = this.conversation.createSession(
      body.platform ?? LeadPlatform.WEBSITE,
      body.customerName,
    );
    return { sessionId: session.id, stage: session.stage };
  }

  @Post('conversation/:sessionId/chat')
  @Public()
  @ApiOperation({ summary: 'Sales Conversation — gửi tin nhắn (tự chuyển stage)' })
  chat(
    @Param('sessionId') sessionId: string,
    @Body() body: { message: string },
  ) {
    return this.conversation.chat(sessionId, body.message);
  }

  @Get('conversation/:sessionId')
  @ApiOperation({ summary: 'Sales Conversation — lấy trạng thái session' })
  getSession(@Param('sessionId') sessionId: string) {
    const session = this.conversation.getSession(sessionId);
    if (!session) return { error: 'Session not found' };
    return { sessionId: session.id, stage: session.stage, context: session.context };
  }

  @Post('conversation/objection')
  @ApiOperation({ summary: 'Sales Conversation — xử lý objection thủ công' })
  handleObjection(@Body() body: { objection: string; productContext?: string }) {
    return this.conversation.handleObjection(body.objection, body.productContext);
  }

  @Post('conversation/closing-script')
  @ApiOperation({ summary: 'Sales Conversation — tạo closing script cho sản phẩm' })
  closingScript(@Body() body: { productName: string; price: number }) {
    return this.conversation.generateClosingScript(body.productName, body.price);
  }

  // ─── F03: Recommendation Engine ───────────────────────────────────────────

  @Get('recommend/upsell/:productId')
  @ApiOperation({ summary: 'Recommendation — upsell (sản phẩm tốt hơn cùng category)' })
  upsell(@Param('productId') id: string, @Query('limit') limit?: number) {
    return this.recommendation.getUpsells(id, limit);
  }

  @Get('recommend/cross-sell/:productId')
  @ApiOperation({ summary: 'Recommendation — cross-sell (thường mua cùng)' })
  crossSell(@Param('productId') id: string, @Query('limit') limit?: number) {
    return this.recommendation.getCrossSells(id, limit);
  }

  @Post('recommend/bundle')
  @ApiOperation({ summary: 'Recommendation — bundle upsell + cross-sell cho giỏ hàng' })
  bundle(@Body() body: { productIds: string[] }) {
    return this.recommendation.getRecommendations(body.productIds);
  }

  @Get('recommend/personalized/:customerId')
  @ApiOperation({ summary: 'Recommendation — gợi ý cá nhân hóa theo lịch sử mua hàng' })
  personalized(@Param('customerId') customerId: string, @Query('limit') limit?: number) {
    return this.recommendation.getPersonalizedRecommendations(customerId, limit);
  }
}
