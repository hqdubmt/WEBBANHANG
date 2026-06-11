import { Controller, Get, Post, Put, Delete, Param, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../auth/auth.guard';
import { UserRole, UserStatus } from '../../database/entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Danh sách người dùng' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
  ) {
    return this.service.findAll({ page, limit, search, role, status });
  }

  @Get('stats')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Thống kê người dùng' })
  stats() {
    return this.service.getStats();
  }

  @Get(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Chi tiết người dùng' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Tạo người dùng mới (Admin only)' })
  create(@Body() body: { email: string; password: string; name: string; role?: UserRole }) {
    return this.service.create(body);
  }

  @Put(':id/role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cập nhật role (Admin only)' })
  updateRole(
    @Param('id') id: string,
    @Body() body: { role: UserRole },
    @Request() req: any,
  ) {
    return this.service.updateRole(id, body.role, req.user.sub);
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Kích hoạt / khóa tài khoản (Admin only)' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: UserStatus },
    @Request() req: any,
  ) {
    return this.service.updateStatus(id, body.status, req.user.sub);
  }

  @Put(':id/reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset mật khẩu (Admin only)' })
  resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return this.service.resetPassword(id, body.password);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xóa người dùng (Admin only)' })
  delete(@Param('id') id: string, @Request() req: any) {
    return this.service.delete(id, req.user.sub);
  }
}
