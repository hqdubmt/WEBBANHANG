import { Controller, Post, Body, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Get('setup-status')
  @Public()
  @ApiOperation({ summary: 'Kiểm tra hệ thống cần tạo admin đầu tiên chưa' })
  setupStatus() {
    return this.service.setupStatus();
  }

  @Post('setup')
  @Public()
  @ApiOperation({ summary: 'Tạo tài khoản Admin đầu tiên (chỉ hoạt động khi chưa có Admin)' })
  setup(@Body() body: { email: string; password: string; name: string }) {
    return this.service.setupAdmin(body.email, body.password, body.name);
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Đăng ký tài khoản (role mặc định: viewer)' })
  register(@Body() body: { email: string; password: string; name: string }) {
    return this.service.register(body.email, body.password, body.name);
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 lần / 15 phút
  @ApiOperation({ summary: 'Đăng nhập' })
  login(@Body() body: { email: string; password: string }) {
    return this.service.login(body.email, body.password);
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 lần / phút
  @ApiOperation({ summary: 'Làm mới access token' })
  refresh(@Body() body: { refreshToken: string }) {
    return this.service.refresh(body.refreshToken);
  }

  @Get('me')
  @ApiOperation({ summary: 'Thông tin người dùng hiện tại' })
  me(@Request() req: any) {
    return req.user;
  }
}
