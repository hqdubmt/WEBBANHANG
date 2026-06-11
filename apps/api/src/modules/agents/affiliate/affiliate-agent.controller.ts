import { Controller, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AffiliateAgentService } from './affiliate-agent.service';

@ApiTags('Agents')
@Controller('agents/affiliate')
export class AffiliateAgentController {
  constructor(private readonly service: AffiliateAgentService) {}

  @Post('run')
  @ApiOperation({ summary: 'Chạy Affiliate Agent thủ công - tìm link cho tất cả sản phẩm chưa có link' })
  run() {
    return this.service.discoverAffiliates();
  }

  @Post('product/:id')
  @ApiOperation({ summary: 'Tìm affiliate link cho một sản phẩm cụ thể' })
  findForProduct(@Param('id') id: string) {
    return this.service.findAffiliateForProduct(id);
  }
}
