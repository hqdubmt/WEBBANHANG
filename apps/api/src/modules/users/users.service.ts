import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User, UserRole, UserStatus } from '../../database/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findAll(query: { page?: number; limit?: number; search?: string; role?: UserRole; status?: UserStatus }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const qb = this.repo.createQueryBuilder('u')
      .select(['u.id', 'u.email', 'u.name', 'u.role', 'u.status', 'u.lastLoginAt', 'u.createdAt'])
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.search) qb.andWhere('(u.name ILIKE :s OR u.email ILIKE :s)', { s: `%${query.search}%` });
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status) qb.andWhere('u.status = :status', { status: query.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Omit<User, 'passwordHash' | 'refreshToken'>> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    const { passwordHash, refreshToken, ...safe } = user;
    return safe as any;
  }

  async create(data: { email: string; password: string; name: string; role?: UserRole }): Promise<User> {
    const existing = await this.repo.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email đã tồn tại');

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data.password, salt, 10000, 64, 'sha512').toString('hex');
    const passwordHash = `${salt}:${hash}`;

    const user = this.repo.create({
      email: data.email,
      name: data.name,
      passwordHash,
      role: data.role || UserRole.VIEWER,
      status: UserStatus.ACTIVE,
    });
    const saved = await this.repo.save(user);
    const { passwordHash: _, refreshToken: __, ...safe } = saved;
    return safe as any;
  }

  async updateRole(id: string, role: UserRole, requesterId: string): Promise<User> {
    if (id === requesterId) throw new BadRequestException('Không thể tự đổi role của mình');
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    await this.repo.update(id, { role });
    return this.findOne(id) as any;
  }

  async updateStatus(id: string, status: UserStatus, requesterId: string): Promise<User> {
    if (id === requesterId) throw new BadRequestException('Không thể tự khóa tài khoản mình');
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    await this.repo.update(id, { status });
    return this.findOne(id) as any;
  }

  async resetPassword(id: string, newPassword: string): Promise<{ message: string }> {
    if (newPassword.length < 6) throw new BadRequestException('Mật khẩu tối thiểu 6 ký tự');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(newPassword, salt, 10000, 64, 'sha512').toString('hex');
    await this.repo.update(id, { passwordHash: `${salt}:${hash}`, refreshToken: null as any });
    return { message: 'Đã reset mật khẩu thành công' };
  }

  async delete(id: string, requesterId: string): Promise<{ deleted: boolean }> {
    if (id === requesterId) throw new BadRequestException('Không thể tự xóa tài khoản mình');
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    await this.repo.delete(id);
    return { deleted: true };
  }

  async getStats() {
    const [total, admins, managers, staff, viewers, active, inactive] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { role: UserRole.ADMIN } }),
      this.repo.count({ where: { role: UserRole.MANAGER } }),
      this.repo.count({ where: { role: UserRole.STAFF } }),
      this.repo.count({ where: { role: UserRole.VIEWER } }),
      this.repo.count({ where: { status: UserStatus.ACTIVE } }),
      this.repo.count({ where: { status: Not(UserStatus.ACTIVE) } }),
    ]);
    return { total, byRole: { admins, managers, staff, viewers }, active, inactive };
  }
}
