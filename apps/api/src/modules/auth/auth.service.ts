import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User, UserRole, UserStatus } from '../../database/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly accessTokenTtl = 60 * 60;        // 1h
  private readonly refreshTokenTtl = 30 * 24 * 3600; // 30d

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    if (!process.env.APP_SECRET) throw new Error('APP_SECRET env variable must be set');
    this.jwtSecret = process.env.APP_SECRET;
  }

  async setupStatus(): Promise<{ needed: boolean }> {
    const adminCount = await this.userRepo.count({ where: { role: UserRole.ADMIN } });
    return { needed: adminCount === 0 };
  }

  async setupAdmin(email: string, password: string, name: string): Promise<TokenPair> {
    const adminCount = await this.userRepo.count({ where: { role: UserRole.ADMIN } });
    if (adminCount > 0) throw new ConflictException('Hệ thống đã có tài khoản Admin. Dùng trang quản lý người dùng để tạo thêm.');

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email đã tồn tại');

    const passwordHash = this.hashPassword(password);
    const user = this.userRepo.create({ email, passwordHash, name, role: UserRole.ADMIN, status: UserStatus.ACTIVE });
    const saved = await this.userRepo.save(user);
    return this.issueTokens(saved);
  }

  async register(email: string, password: string, name: string, role = UserRole.VIEWER): Promise<TokenPair> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email đã tồn tại');

    const passwordHash = this.hashPassword(password);
    const user = this.userRepo.create({ email, passwordHash, name, role });
    const saved = await this.userRepo.save(user);

    return this.issueTokens(saved);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = this.verifyToken(refreshToken);
    const user = await this.userRepo.findOne({ where: { id: payload.sub, refreshToken } });
    if (!user) throw new UnauthorizedException('Refresh token không hợp lệ');

    return this.issueTokens(user);
  }

  async validateToken(token: string): Promise<JwtPayload> {
    return this.verifyToken(token);
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.signToken(payload, this.accessTokenTtl);
    const refreshToken = this.signToken(payload, this.refreshTokenTtl);

    await this.userRepo.update(user.id, { refreshToken });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
    };
  }

  private signToken(payload: Record<string, any>, expiresIn: number): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + expiresIn;
    const body = Buffer.from(JSON.stringify({ ...payload, exp, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
    const sig = crypto.createHmac('sha256', this.jwtSecret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
  }

  private verifyToken(token: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Token không hợp lệ');

    const [header, body, sig] = parts;
    const expected = crypto.createHmac('sha256', this.jwtSecret).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) throw new UnauthorizedException('Token chữ ký không hợp lệ');

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) throw new UnauthorizedException('Token đã hết hạn');

    return payload as JwtPayload;
  }

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 310000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    const check = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return check === hash;
  }
}
