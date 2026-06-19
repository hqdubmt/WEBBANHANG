import { Controller, Get, Post, Put, Param, Query, Body, Redirect, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AffiliatePortalService } from './affiliate-portal.service';
import { AffiliatePartnerStatus } from '../../database/entities/affiliate-partner.entity';
import { Public } from '../auth/auth.guard';

@ApiTags('Affiliate Portal')
@Controller('affiliate-portal')
export class AffiliatePortalController {
  constructor(private readonly svc: AffiliatePortalService) {}

  // Partners
  @Get('partners')
  @ApiOperation({ summary: 'Danh sách affiliate partners' })
  listPartners(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: AffiliatePartnerStatus,
  ) {
    return this.svc.listPartners(Number(page), Number(limit), search, status);
  }

  @Get('partners/stats')
  @ApiOperation({ summary: 'Thống kê affiliate partners' })
  statsPartners() {
    return this.svc.statsPartners();
  }

  @Get('partners/:id')
  findPartner(@Param('id') id: string) {
    return this.svc.findPartner(id);
  }

  @Get('partners/:id/stats')
  @ApiOperation({ summary: 'Thống kê chi tiết của một partner' })
  partnerStats(@Param('id') id: string) {
    return this.svc.getPartnerStats(id);
  }

  @Post('partners')
  @ApiOperation({ summary: 'Đăng ký affiliate partner' })
  createPartner(@Body() body: any) {
    return this.svc.createPartner(body);
  }

  @Put('partners/:id')
  updatePartner(@Param('id') id: string, @Body() body: any) {
    return this.svc.updatePartner(id, body);
  }

  @Put('partners/:id/approve')
  @ApiOperation({ summary: 'Duyệt affiliate partner' })
  approvePartner(@Param('id') id: string) {
    return this.svc.approvePartner(id);
  }

  @Put('partners/:id/suspend')
  @ApiOperation({ summary: 'Tạm dừng affiliate partner' })
  suspendPartner(@Param('id') id: string) {
    return this.svc.suspendPartner(id);
  }

  // ─── Public click redirect ────────────────────────────────────────────────
  // URL: /api/affiliate-portal/go/:refCode?p={productId}
  // Ghi nhận click → redirect đến affiliate link thật

  @Get('go/:refCode')
  @Public()
  @ApiOperation({ summary: 'Click redirect — ghi nhận rồi redirect đến AT link (public)' })
  async goRedirect(
    @Param('refCode') refCode: string,
    @Query('p') productId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const destination = await this.svc.handleClick(refCode, productId, {
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      referer: req.headers['referer'] || '',
    });
    return res.redirect(302, destination);
  }

  // Clicks
  @Post('clicks')
  @Public()
  @ApiOperation({ summary: 'Ghi nhận click affiliate (public)' })
  trackClick(@Body() body: any) {
    return this.svc.trackClick(body);
  }

  // Conversions
  @Get('conversions')
  @ApiOperation({ summary: 'Danh sách conversions' })
  listConversions(@Query('partnerId') partnerId?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.listConversions(partnerId, Number(page), Number(limit));
  }

  @Post('conversions')
  @ApiOperation({ summary: 'Ghi nhận conversion từ đơn hàng' })
  createConversion(@Body() body: any) {
    return this.svc.createConversion(body);
  }

  @Put('conversions/:id/approve')
  @ApiOperation({ summary: 'Duyệt commission' })
  approveConversion(@Param('id') id: string) {
    return this.svc.approveConversion(id);
  }

  @Put('conversions/:id/pay')
  @ApiOperation({ summary: 'Đánh dấu đã thanh toán commission' })
  payConversion(@Param('id') id: string) {
    return this.svc.payConversion(id);
  }
}
