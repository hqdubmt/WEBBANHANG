import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MobileService } from './mobile.service';
import { MobileSession } from '../../database/entities/mobile-session.entity';
import { Public } from '../auth/auth.guard';

@ApiTags('Mobile')
@Controller('mobile')
export class MobileController {
  constructor(private readonly svc: MobileService) {}

  @Get('stats')
  @ApiOperation({ summary: 'DAU/MAU, crash rate, platform breakdown' })
  stats() {
    return this.svc.getStats();
  }

  @Get('retention')
  @ApiOperation({ summary: 'D1/D7/D30 retention' })
  retention() {
    return this.svc.getRetention();
  }

  @Public()
  @Post('session')
  @ApiOperation({ summary: 'Bắt đầu session mới (SDK mobile gọi)' })
  trackSession(@Body() dto: Partial<MobileSession>) {
    return this.svc.trackSession(dto);
  }

  @Public()
  @Patch('session/:id/end')
  @ApiOperation({ summary: 'Kết thúc session' })
  endSession(@Param('id') id: string, @Body() body: { durationSeconds: number; screenViews: number; crashed?: boolean }) {
    return this.svc.endSession(id, body.durationSeconds, body.screenViews, body.crashed);
  }
}
