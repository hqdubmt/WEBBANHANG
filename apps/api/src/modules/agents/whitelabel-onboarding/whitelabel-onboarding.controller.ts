import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WhitelabelOnboardingService } from './whitelabel-onboarding.service';

@ApiTags('Agent25 WhitelabelOnboarding')
@Controller('agents/whitelabel-onboarding')
export class WhitelabelOnboardingController {
  constructor(private readonly svc: WhitelabelOnboardingService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê WhitelabelOnboarding' })
  stats() {
    return this.svc.getStats();
  }

  @Post('run')
  @ApiOperation({ summary: 'Chạy WhitelabelOnboarding thủ công' })
  run() {
    return this.svc.checkOnboarding();
  }
}
