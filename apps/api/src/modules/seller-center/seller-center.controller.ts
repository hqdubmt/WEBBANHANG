import { Controller, Get, Post, Put, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TiktokSellerService } from './tiktok-seller.service';
import { LazadaSellerService } from './lazada-seller.service';
import { ShopeeSellerService } from './shopee-seller.service';
import { BrowserSellerService } from './browser-seller.service';
import { SellerAccount, SellerPlatform, SellerAccountStatus } from './entities/seller-account.entity';
import { SellerProduct } from './entities/seller-product.entity';
import { SellerOrder, SellerOrderStatus } from './entities/seller-order.entity';

@ApiTags('Seller Center')
@Controller('seller')
export class SellerCenterController {
  constructor(
    private readonly tiktok: TiktokSellerService,
    private readonly lazada: LazadaSellerService,
    private readonly shopee: ShopeeSellerService,
    private readonly browser: BrowserSellerService,
    @InjectRepository(SellerAccount) private readonly accountRepo: Repository<SellerAccount>,
    @InjectRepository(SellerProduct) private readonly productRepo: Repository<SellerProduct>,
    @InjectRepository(SellerOrder)   private readonly orderRepo: Repository<SellerOrder>,
  ) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Tổng quan tất cả gian hàng đang kết nối' })
  async dashboard() {
    const accounts = await this.accountRepo.find({ where: { status: SellerAccountStatus.ACTIVE } });

    const stats = await Promise.all(accounts.map(async acc => {
      const svc = this.getService(acc.platform);
      const s = svc ? await svc.getStats(acc.id) : {};
      return { accountId: acc.id, platform: acc.platform, shopName: acc.shopName, ...s };
    }));

    return {
      totalAccounts: accounts.length,
      platforms: stats,
      summary: {
        totalProducts: stats.reduce((s, p) => s + (p['totalProducts'] || 0), 0),
        totalOrders:   stats.reduce((s, p) => s + (p['totalOrders'] || 0), 0),
        totalRevenue:  stats.reduce((s, p) => s + (p['revenue'] || 0), 0),
        pendingOrders: stats.reduce((s, p) => s + (p['pendingOrders'] || 0), 0),
      },
    };
  }

  // ─── Accounts ─────────────────────────────────────────────────────────────

  @Get('accounts')
  @ApiOperation({ summary: 'Danh sách gian hàng đã kết nối' })
  getAccounts() {
    return this.accountRepo.find({ order: { createdAt: 'DESC' } });
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Chi tiết 1 gian hàng' })
  getAccount(@Param('id') id: string) {
    return this.accountRepo.findOne({ where: { id } });
  }

  @Put('accounts/:id/disconnect')
  @ApiOperation({ summary: 'Ngắt kết nối gian hàng' })
  async disconnectAccount(@Param('id') id: string) {
    await this.accountRepo.update(id, { status: SellerAccountStatus.DISCONNECTED });
    return { ok: true };
  }

  // ─── OAuth connect ────────────────────────────────────────────────────────

  @Get('connect/tiktok/url')
  @ApiOperation({ summary: 'Lấy URL đăng nhập TikTok Shop (OAuth)' })
  getTikTokAuthUrl() {
    const url = this.tiktok.getAuthUrl();
    if (!url) throw new BadRequestException('Chưa cấu hình TIKTOK_SHOP_APP_KEY');
    return { url };
  }

  @Post('connect/tiktok/callback')
  @ApiOperation({ summary: 'Callback sau khi đăng nhập TikTok Shop' })
  async tiktokCallback(@Body('code') code: string) {
    if (!code) throw new BadRequestException('Thiếu auth code');
    const account = await this.tiktok.exchangeToken(code);
    if (!account) throw new BadRequestException('Không thể xác thực TikTok');
    return { ok: true, account: { id: account.id, shopName: account.shopName, platform: account.platform } };
  }

  @Get('connect/lazada/url')
  @ApiOperation({ summary: 'Lấy URL đăng nhập Lazada Seller (OAuth)' })
  getLazadaAuthUrl(@Query('redirect_uri') redirectUri: string) {
    const uri = redirectUri || `${process.env.WEB_URL || 'http://localhost:3005'}/seller/lazada/callback`;
    const url = this.lazada.getAuthUrl(uri);
    if (!url) throw new BadRequestException('Chưa cấu hình LAZADA_APP_KEY');
    return { url };
  }

  @Post('connect/lazada/callback')
  @ApiOperation({ summary: 'Callback sau khi đăng nhập Lazada' })
  async lazadaCallback(@Body('code') code: string) {
    if (!code) throw new BadRequestException('Thiếu auth code');
    const account = await this.lazada.exchangeToken(code);
    if (!account) throw new BadRequestException('Không thể xác thực Lazada');
    return { ok: true, account: { id: account.id, shopName: account.shopName, platform: account.platform } };
  }

  @Get('connect/shopee/url')
  @ApiOperation({ summary: 'Lấy URL đăng nhập Shopee Seller (OAuth)' })
  getShopeeAuthUrl(@Query('redirect_uri') redirectUri: string) {
    const uri = redirectUri || `${process.env.WEB_URL || 'http://localhost:3005'}/seller/shopee/callback`;
    const url = this.shopee.getAuthUrl(uri);
    if (!url) throw new BadRequestException('Chưa cấu hình SHOPEE_PARTNER_ID / SHOPEE_PARTNER_KEY');
    return { url };
  }

  @Post('connect/shopee/callback')
  @ApiOperation({ summary: 'Callback sau khi đăng nhập Shopee' })
  async shopeeCallback(@Body('code') code: string, @Body('shop_id') shopId: number) {
    if (!code || !shopId) throw new BadRequestException('Thiếu code hoặc shop_id');
    const account = await this.shopee.exchangeToken(code, shopId);
    if (!account) throw new BadRequestException('Không thể xác thực Shopee');
    return { ok: true, account: { id: account.id, shopName: account.shopName, platform: account.platform } };
  }

  // ─── Đăng nhập trực tiếp bằng tài khoản (không cần API key) ─────────────

  // ─── Import cookie từ browser (không bị CAPTCHA) ─────────────────────────

  @Post('connect/shopee/cookie')
  @ApiOperation({ summary: 'Import cookie Shopee từ browser (F12 → Console → document.cookie)' })
  async shopeeCookieImport(@Body('cookie') cookie: string, @Body('username') username?: string) {
    if (!cookie) throw new BadRequestException('Thiếu cookie string');
    const account = await this.browser.importCookieShopee(cookie, username);
    if (!account) throw new BadRequestException('Cookie Shopee không hợp lệ hoặc đã hết hạn');
    return { ok: true, account: { id: account.id, shopName: account.shopName, platform: account.platform, shopId: account.shopId } };
  }

  @Post('connect/lazada/cookie')
  @ApiOperation({ summary: 'Import cookie Lazada từ browser' })
  async lazadaCookieImport(@Body('cookie') cookie: string, @Body('username') username?: string) {
    if (!cookie) throw new BadRequestException('Thiếu cookie string');
    const account = await this.browser.importCookieLazada(cookie, username);
    if (!account) throw new BadRequestException('Cookie Lazada không hợp lệ hoặc đã hết hạn');
    return { ok: true, account: { id: account.id, shopName: account.shopName, platform: account.platform } };
  }

  @Post('connect/tiktok/cookie')
  @ApiOperation({ summary: 'Import cookie TikTok Seller từ browser' })
  async tiktokCookieImport(@Body('cookie') cookie: string, @Body('username') username?: string) {
    if (!cookie) throw new BadRequestException('Thiếu cookie string');
    const account = await this.browser.importCookieTiktok(cookie, username);
    if (!account) throw new BadRequestException('Cookie TikTok không hợp lệ hoặc đã hết hạn');
    return { ok: true, account: { id: account.id, shopName: account.shopName, platform: account.platform } };
  }

  @Post('connect/shopee/login')
  @ApiOperation({ summary: 'Đăng nhập Shopee bằng tài khoản (email/SĐT + mật khẩu)' })
  async shopeeLogin(@Body('username') username: string, @Body('password') password: string) {
    if (!username || !password) throw new BadRequestException('Thiếu username hoặc password');
    const account = await this.browser.loginShopee(username, password);
    if (!account) throw new BadRequestException('Đăng nhập Shopee thất bại — kiểm tra lại tài khoản/mật khẩu hoặc captcha');
    return { ok: true, account: { id: account.id, shopName: account.shopName, platform: account.platform, shopId: account.shopId } };
  }

  @Post('connect/lazada/login')
  @ApiOperation({ summary: 'Đăng nhập Lazada Seller bằng tài khoản' })
  async lazadaLogin(@Body('username') username: string, @Body('password') password: string) {
    if (!username || !password) throw new BadRequestException('Thiếu username hoặc password');
    const account = await this.browser.loginLazada(username, password);
    if (!account) throw new BadRequestException('Đăng nhập Lazada thất bại');
    return { ok: true, account: { id: account.id, shopName: account.shopName, platform: account.platform } };
  }

  @Post('connect/tiktok/login')
  @ApiOperation({ summary: 'Đăng nhập TikTok Seller bằng tài khoản (trả về sessionId nếu cần OTP)' })
  async tiktokLogin(@Body('username') username: string, @Body('password') password: string) {
    if (!username || !password) throw new BadRequestException('Thiếu username hoặc password');
    const result = await this.browser.loginTiktok(username, password);
    if (!result) throw new BadRequestException('Đăng nhập TikTok thất bại — kiểm tra lại tài khoản/mật khẩu');
    if ('needOtp' in result) {
      return { ok: false, needOtp: true, sessionId: result.sessionId, message: result.message };
    }
    const account = result.account;
    return { ok: true, account: { id: account.id, shopName: account.shopName, platform: account.platform } };
  }

  @Post('connect/tiktok/verify-otp')
  @ApiOperation({ summary: 'Nhập OTP để hoàn tất đăng nhập TikTok (sau khi gọi /login)' })
  async tiktokVerifyOtp(@Body('sessionId') sessionId: string, @Body('otp') otp: string) {
    if (!sessionId || !otp) throw new BadRequestException('Thiếu sessionId hoặc OTP');
    const account = await this.browser.completeTiktokOtp(sessionId, otp);
    if (!account) throw new BadRequestException('OTP sai hoặc đã hết hạn (10 phút). Thử đăng nhập lại.');
    return { ok: true, account: { id: account.id, shopName: account.shopName, platform: account.platform } };
  }

  @Post('accounts/:id/relogin')
  @ApiOperation({ summary: 'Đăng nhập lại khi cookie hết hạn (dùng thông tin đã lưu)' })
  async relogin(@Param('id') id: string) {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) throw new BadRequestException('Không tìm thấy gian hàng');
    const ok = await this.browser.relogin(account);
    return { ok };
  }

  // ─── Sync ─────────────────────────────────────────────────────────────────

  @Post('accounts/:id/sync/products')
  @ApiOperation({ summary: 'Đồng bộ sản phẩm từ sàn về hệ thống' })
  async syncProducts(@Param('id') id: string) {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) throw new BadRequestException('Không tìm thấy gian hàng');

    if (account.loginType === 'browser') {
      let count = 0;
      if (account.platform === SellerPlatform.SHOPEE) count = await this.browser.syncShopeeProducts(account);
      else if (account.platform === SellerPlatform.LAZADA) count = await this.browser.syncLazadaProducts(account);
      else if (account.platform === SellerPlatform.TIKTOK) count = await this.browser.syncTiktokProducts(account);
      return { ok: true, synced: count };
    }

    await this.ensureTokenFresh(account);
    const svc = this.getService(account.platform);
    if (!svc) throw new BadRequestException('Platform không hỗ trợ');
    const count = await svc.syncProducts(account);
    return { ok: true, synced: count };
  }

  @Post('accounts/:id/sync/orders')
  @ApiOperation({ summary: 'Đồng bộ đơn hàng từ sàn về hệ thống' })
  async syncOrders(@Param('id') id: string, @Query('days') days = '7') {
    const account = await this.accountRepo.findOne({ where: { id } });
    if (!account) throw new BadRequestException('Không tìm thấy gian hàng');

    if (account.loginType === 'browser') {
      let count = 0;
      const d = parseInt(days);
      if (account.platform === SellerPlatform.SHOPEE) count = await this.browser.syncShopeeOrders(account, d);
      else if (account.platform === SellerPlatform.LAZADA) count = await this.browser.syncLazadaOrders(account, d);
      else if (account.platform === SellerPlatform.TIKTOK) count = await this.browser.syncTiktokOrders(account, d);
      return { ok: true, synced: count };
    }

    await this.ensureTokenFresh(account);
    const svc = this.getService(account.platform);
    if (!svc) throw new BadRequestException('Platform không hỗ trợ');
    const count = await svc.syncOrders(account, parseInt(days));
    return { ok: true, synced: count };
  }

  @Post('sync/all')
  @ApiOperation({ summary: 'Đồng bộ tất cả gian hàng cùng lúc' })
  async syncAll(@Query('days') days = '7') {
    const accounts = await this.accountRepo.find({ where: { status: SellerAccountStatus.ACTIVE } });
    const results = await Promise.allSettled(accounts.map(async acc => {
      await this.ensureTokenFresh(acc);
      const svc = this.getService(acc.platform);
      if (!svc) return { platform: acc.platform, shop: acc.shopName, error: 'Not supported' };
      const [products, orders] = await Promise.all([svc.syncProducts(acc), svc.syncOrders(acc, parseInt(days))]);
      return { platform: acc.platform, shop: acc.shopName, products, orders };
    }));
    return results.map((r, i) => ({
      accountId: accounts[i].id,
      ...(r.status === 'fulfilled' ? r.value : { error: (r as any).reason?.message }),
    }));
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  @Get('products')
  @ApiOperation({ summary: 'Danh sách sản phẩm trên sàn (đã sync)' })
  async getProducts(
    @Query('accountId') accountId?: string,
    @Query('platform') platform?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const qb = this.productRepo.createQueryBuilder('p')
      .leftJoinAndSelect('p.account', 'a')
      .orderBy('p.updatedAt', 'DESC')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .take(parseInt(limit));

    if (accountId) qb.andWhere('p.accountId = :accountId', { accountId });
    if (platform) qb.andWhere('a.platform = :platform', { platform });
    if (status) qb.andWhere('p.status = :status', { status });
    if (search) qb.andWhere('p.name ILIKE :search', { search: `%${search}%` });

    const [items, total] = await qb.getManyAndCount();
    return { total, page: parseInt(page), limit: parseInt(limit), items };
  }

  @Put('products/:id/price')
  @ApiOperation({ summary: 'Cập nhật giá sản phẩm lên sàn' })
  async updatePrice(
    @Param('id') id: string,
    @Body('price') price: number,
    @Body('salePrice') salePrice?: number,
  ) {
    const product = await this.productRepo.findOne({ where: { id }, relations: ['account'] });
    if (!product) throw new BadRequestException('Không tìm thấy sản phẩm');
    const account = product.account;
    await this.ensureTokenFresh(account);

    let ok = false;
    if (account.platform === SellerPlatform.TIKTOK) {
      ok = await this.tiktok.updateProductPrice(account, product.platformProductId, product.platformSkuId, price);
    } else if (account.platform === SellerPlatform.LAZADA) {
      ok = await this.lazada.updateProductPrice(account, product.platformSkuId, price, salePrice);
    } else if (account.platform === SellerPlatform.SHOPEE) {
      ok = await this.shopee.updateProductPrice(account, Number(product.platformProductId), null, price);
    }

    if (ok) await this.productRepo.update(id, { price, salePrice: salePrice || price });
    return { ok };
  }

  @Put('products/:id/stock')
  @ApiOperation({ summary: 'Cập nhật tồn kho lên sàn' })
  async updateStock(@Param('id') id: string, @Body('stock') stock: number) {
    const product = await this.productRepo.findOne({ where: { id }, relations: ['account'] });
    if (!product) throw new BadRequestException('Không tìm thấy sản phẩm');
    const account = product.account;
    await this.ensureTokenFresh(account);

    let ok = false;
    if (account.platform === SellerPlatform.TIKTOK) {
      ok = await this.tiktok.updateProductStock(account, product.platformProductId, product.platformSkuId, stock);
    } else if (account.platform === SellerPlatform.LAZADA) {
      ok = await this.lazada.updateProductStock(account, product.platformSkuId, stock);
    } else if (account.platform === SellerPlatform.SHOPEE) {
      ok = await this.shopee.updateProductStock(account, Number(product.platformProductId), null, stock);
    }

    if (ok) await this.productRepo.update(id, { stock });
    return { ok };
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'Danh sách đơn hàng (đã sync)' })
  async getOrders(
    @Query('accountId') accountId?: string,
    @Query('platform') platform?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const qb = this.orderRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.account', 'a')
      .orderBy('o.platformCreatedAt', 'DESC')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .take(parseInt(limit));

    if (accountId) qb.andWhere('o.accountId = :accountId', { accountId });
    if (platform) qb.andWhere('a.platform = :platform', { platform });
    if (status) qb.andWhere('o.status = :status', { status });

    const [items, total] = await qb.getManyAndCount();
    return { total, page: parseInt(page), limit: parseInt(limit), items };
  }

  @Get('orders/pending')
  @ApiOperation({ summary: 'Đơn hàng cần xử lý (pending + confirmed)' })
  async getPendingOrders() {
    const orders = await this.orderRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.account', 'a')
      .where('o.status IN (:...statuses)', { statuses: [SellerOrderStatus.PENDING, SellerOrderStatus.CONFIRMED] })
      .orderBy('o.platformCreatedAt', 'ASC')
      .getMany();
    return { count: orders.length, orders };
  }

  @Post('orders/:id/ship')
  @ApiOperation({ summary: 'Xác nhận giao hàng / ship đơn' })
  async shipOrder(@Param('id') id: string, @Body('trackingNumber') trackingNumber?: string) {
    const order = await this.orderRepo.findOne({ where: { id }, relations: ['account'] });
    if (!order) throw new BadRequestException('Không tìm thấy đơn hàng');
    const account = order.account;
    await this.ensureTokenFresh(account);

    let ok = false;
    if (account.platform === SellerPlatform.TIKTOK) {
      ok = await this.tiktok.confirmOrderShipment(account, order.platformOrderId);
    } else if (account.platform === SellerPlatform.LAZADA) {
      ok = await this.lazada.setOrderStatusToReadyToShip(account, order.platformOrderId, [], 'dropship', '');
    } else if (account.platform === SellerPlatform.SHOPEE) {
      ok = await this.shopee.shipOrder(account, order.platformOrderId, trackingNumber);
    }

    if (ok) await this.orderRepo.update(id, { status: SellerOrderStatus.SHIPPED, trackingNumber: trackingNumber || order.trackingNumber });
    return { ok };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getService(platform: SellerPlatform) {
    if (platform === SellerPlatform.TIKTOK) return this.tiktok;
    if (platform === SellerPlatform.LAZADA) return this.lazada;
    if (platform === SellerPlatform.SHOPEE) return this.shopee;
    return null;
  }

  private async ensureTokenFresh(account: SellerAccount) {
    if (!account.tokenExpiresAt) return;
    const expiresIn = account.tokenExpiresAt.getTime() - Date.now();
    if (expiresIn < 3600_000) {
      const svc = this.getService(account.platform);
      if (svc) await svc.refreshAccessToken(account);
    }
  }
}
