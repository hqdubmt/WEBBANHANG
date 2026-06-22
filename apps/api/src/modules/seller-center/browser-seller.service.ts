import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosRequestConfig } from 'axios';
import * as crypto from 'crypto';
import { SellerAccount, SellerPlatform, SellerAccountStatus } from './entities/seller-account.entity';
import { SellerProduct, SellerProductStatus } from './entities/seller-product.entity';
import { SellerOrder, SellerOrderStatus } from './entities/seller-order.entity';

const ENCRYPT_KEY = (process.env.APP_SECRET || 'default_key_32chars_padded!!!!').slice(0, 32).padEnd(32, '!');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY), iv);
  return iv.toString('hex') + ':' + Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('hex');
}

function decrypt(enc: string): string {
  const [ivHex, dataHex] = enc.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY), Buffer.from(ivHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}

function cookiesToHeader(cookies: any[]): string {
  return (cookies || []).map((c: any) => `${c.name}=${c.value}`).join('; ');
}

@Injectable()
export class BrowserSellerService {
  private readonly logger = new Logger(BrowserSellerService.name);

  constructor(
    @InjectRepository(SellerAccount) private readonly accountRepo: Repository<SellerAccount>,
    @InjectRepository(SellerProduct) private readonly productRepo: Repository<SellerProduct>,
    @InjectRepository(SellerOrder)   private readonly orderRepo: Repository<SellerOrder>,
  ) {}

  // ── Login flows ───────────────────────────────────────────────────────────

  async loginShopee(username: string, password: string): Promise<SellerAccount | null> {
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
      });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();

      this.logger.log('Shopee: mở trang đăng nhập...');
      await page.goto('https://banhang.shopee.vn/account/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Điền form
      await page.fill('input[name="loginKey"], input[type="text"]', username);
      await page.fill('input[name="password"], input[type="password"]', password);
      await page.waitForTimeout(500);
      await page.click('button[type="submit"], .login-btn');

      // Chờ redirect về dashboard
      await page.waitForURL('**/portal**', { timeout: 30000 }).catch(() =>
        page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {})
      );
      await page.waitForTimeout(3000);

      const cookies = await context.cookies() as any[];
      const currentUrl = page.url();
      this.logger.log(`Shopee login → ${currentUrl}`);
      await browser.close();

      if (!cookies.length || currentUrl.includes('login')) {
        this.logger.error('Shopee login thất bại');
        return null;
      }

      // Lấy shopId từ cookie SPC_EC
      let shopId = '';
      const spcEc = cookies.find(c => c.name === 'SPC_EC');
      if (spcEc) {
        try {
          const payload = JSON.parse(Buffer.from(spcEc.value.split('.')[1] || '', 'base64').toString());
          shopId = payload?.shopid?.toString() || '';
        } catch { /* ignore */ }
      }

      const csrfToken = cookies.find(c => c.name === 'csrftoken')?.value || '';
      const sessionHeaders: Record<string, string> = {
        'X-CSRFTOKEN': csrfToken,
        'Referer': 'https://banhang.shopee.vn/',
        'Origin': 'https://banhang.shopee.vn',
      };

      const existing = await this.accountRepo.findOne({
        where: { platform: SellerPlatform.SHOPEE, username },
      });

      const data = {
        platform: SellerPlatform.SHOPEE,
        status: SellerAccountStatus.ACTIVE,
        loginType: 'browser',
        username,
        passwordEncrypted: encrypt(password),
        cookies,
        sessionHeaders,
        shopId,
        shopName: username,
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 ngày
        accessToken: csrfToken,
      };

      if (existing) {
        await this.accountRepo.update(existing.id, data);
        return { ...existing, ...data };
      }
      return this.accountRepo.save(this.accountRepo.create(data));
    } catch (e: any) {
      this.logger.error(`Shopee login error: ${e.message}`);
      return null;
    }
  }

  async loginLazada(username: string, password: string): Promise<SellerAccount | null> {
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
      });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();

      // Intercept để lấy Authorization token
      let authToken = '';
      page.on('request', req => {
        const auth = req.headers()['authorization'] || req.headers()['x-access-token'];
        if (auth && auth.startsWith('Bearer ')) authToken = auth.slice(7);
      });

      this.logger.log('Lazada: mở trang đăng nhập...');
      await page.goto('https://sellercenter.lazada.vn/apps/seller/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      await page.fill('input[name="username"], input[type="email"], input[type="text"]', username);
      await page.fill('input[name="password"], input[type="password"]', password);
      await page.waitForTimeout(500);
      await page.click('button[type="submit"], .login-btn, .submit');

      await page.waitForURL('**/app**', { timeout: 30000 }).catch(() =>
        page.waitForURL('**/home**', { timeout: 10000 }).catch(() => {})
      );
      await page.waitForTimeout(3000);

      const cookies = await context.cookies() as any[];
      const currentUrl = page.url();
      this.logger.log(`Lazada login → ${currentUrl}`);
      await browser.close();

      if (!cookies.length || currentUrl.includes('login')) {
        this.logger.error('Lazada login thất bại');
        return null;
      }

      const ascToken = cookies.find(c => c.name === '_asc_t')?.value || authToken || '';
      const sessionHeaders: Record<string, string> = {
        'Authorization': `Bearer ${ascToken}`,
        'Referer': 'https://sellercenter.lazada.vn/',
      };

      const existing = await this.accountRepo.findOne({
        where: { platform: SellerPlatform.LAZADA, username },
      });
      const data = {
        platform: SellerPlatform.LAZADA,
        status: SellerAccountStatus.ACTIVE,
        loginType: 'browser',
        username,
        passwordEncrypted: encrypt(password),
        cookies,
        sessionHeaders,
        shopName: username,
        accessToken: ascToken,
        tokenExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      };

      if (existing) {
        await this.accountRepo.update(existing.id, data);
        return { ...existing, ...data };
      }
      return this.accountRepo.save(this.accountRepo.create(data));
    } catch (e: any) {
      this.logger.error(`Lazada login error: ${e.message}`);
      return null;
    }
  }

  async loginTiktok(username: string, password: string): Promise<SellerAccount | null> {
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
      });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();

      let shopId = '';
      page.on('response', async res => {
        if (res.url().includes('/passport/web/account/info')) {
          try {
            const body = await res.json();
            shopId = body?.data?.shop_id?.toString() || '';
          } catch { /* ignore */ }
        }
      });

      this.logger.log('TikTok Seller: mở trang đăng nhập...');
      await page.goto('https://seller-vn.tiktok.com/account/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Thử login bằng email/phone + password
      await page.click('[data-e2e="login-tab-email"], .login-tab-email, button:has-text("Email")').catch(() => {});
      await page.waitForTimeout(500);
      await page.fill('input[name="email"], input[type="email"], input[placeholder*="mail"], input[placeholder*="số điện thoại"]', username);
      await page.fill('input[name="password"], input[type="password"]', password);
      await page.waitForTimeout(500);
      await page.click('button[type="submit"], .login-btn');

      await page.waitForURL('**/home**', { timeout: 40000 }).catch(() =>
        page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {})
      );
      await page.waitForTimeout(4000);

      const cookies = await context.cookies() as any[];
      const currentUrl = page.url();
      this.logger.log(`TikTok login → ${currentUrl}`);
      await browser.close();

      if (!cookies.length || currentUrl.includes('login')) {
        this.logger.error('TikTok login thất bại');
        return null;
      }

      const ttwid = cookies.find(c => c.name === 'ttwid')?.value || '';
      const csrfToken = cookies.find(c => c.name === 'passport_csrf_token')?.value || '';
      const sessionHeaders: Record<string, string> = {
        'x-csrf-token': csrfToken,
        'Referer': 'https://seller-vn.tiktok.com/',
      };

      const existing = await this.accountRepo.findOne({
        where: { platform: SellerPlatform.TIKTOK, username },
      });
      const data = {
        platform: SellerPlatform.TIKTOK,
        status: SellerAccountStatus.ACTIVE,
        loginType: 'browser',
        username,
        passwordEncrypted: encrypt(password),
        cookies,
        sessionHeaders,
        shopId,
        shopName: username,
        accessToken: ttwid,
        tokenExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      };

      if (existing) {
        await this.accountRepo.update(existing.id, data);
        return { ...existing, ...data };
      }
      return this.accountRepo.save(this.accountRepo.create(data));
    } catch (e: any) {
      this.logger.error(`TikTok login error: ${e.message}`);
      return null;
    }
  }

  // ── Re-login khi cookie hết hạn ──────────────────────────────────────────

  async relogin(account: SellerAccount): Promise<boolean> {
    if (!account.passwordEncrypted) return false;
    let password: string;
    try { password = decrypt(account.passwordEncrypted); } catch { return false; }

    let updated: SellerAccount | null = null;
    if (account.platform === SellerPlatform.SHOPEE) updated = await this.loginShopee(account.username, password);
    if (account.platform === SellerPlatform.LAZADA)  updated = await this.loginLazada(account.username, password);
    if (account.platform === SellerPlatform.TIKTOK)  updated = await this.loginTiktok(account.username, password);
    return !!updated;
  }

  // ── HTTP helper với cookie auth ───────────────────────────────────────────

  private buildAxiosConfig(account: SellerAccount, extra?: AxiosRequestConfig): AxiosRequestConfig {
    const cookieHeader = cookiesToHeader(account.cookies || []);
    return {
      timeout: 15000,
      ...extra,
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        ...(account.sessionHeaders || {}),
        ...(extra?.headers || {}),
      },
    };
  }

  async call<T>(account: SellerAccount, method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, data?: any): Promise<T | null> {
    try {
      const cfg = this.buildAxiosConfig(account, { method, url, data });
      if (method === 'GET' && data) cfg.params = data;
      const res = await axios(cfg);
      return res.data as T;
    } catch (e: any) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        this.logger.warn(`${account.platform} ${url}: auth expired → relogin`);
        const ok = await this.relogin(account);
        if (ok) {
          const fresh = await this.accountRepo.findOne({ where: { id: account.id } });
          if (fresh) {
            const cfg2 = this.buildAxiosConfig(fresh, { method, url, data });
            if (method === 'GET' && data) cfg2.params = data;
            const res2 = await axios(cfg2);
            return res2.data as T;
          }
        }
      }
      this.logger.error(`${account.platform} ${url}: ${e.message}`);
      return null;
    }
  }

  // ── Shopee internal APIs ──────────────────────────────────────────────────

  async shopeeGetProducts(account: SellerAccount, offset = 0, pageSize = 50): Promise<any> {
    return this.call(account, 'GET', 'https://banhang.shopee.vn/api/v3/product/get_item_list', {
      page_size: pageSize,
      offset,
      item_status: 2, // 2=active
    });
  }

  async shopeeGetOrders(account: SellerAccount, timeFrom: number, timeTo: number): Promise<any> {
    return this.call(account, 'GET', 'https://banhang.shopee.vn/api/v3/order/get_order_list', {
      time_from: timeFrom,
      time_to: timeTo,
      page: 1,
      page_size: 50,
    });
  }

  async shopeeUpdateStock(account: SellerAccount, itemId: number, stock: number, modelId = 0): Promise<any> {
    return this.call(account, 'PATCH', 'https://banhang.shopee.vn/api/v3/product/update_stock', {
      item_id: itemId,
      stock_list: [{ model_id: modelId, normal_stock: stock }],
    });
  }

  async shopeeUpdatePrice(account: SellerAccount, itemId: number, price: number, modelId = 0): Promise<any> {
    return this.call(account, 'PATCH', 'https://banhang.shopee.vn/api/v3/product/update_price', {
      item_id: itemId,
      price_list: [{ model_id: modelId, original_price: price }],
    });
  }

  // ── Lazada internal APIs ──────────────────────────────────────────────────

  async lazadaGetProducts(account: SellerAccount, offset = 0, limit = 50): Promise<any> {
    return this.call(account, 'GET', 'https://sellercenter.lazada.vn/api/seller/products', {
      limit,
      offset,
    });
  }

  async lazadaGetOrders(account: SellerAccount, startTime: string, endTime: string): Promise<any> {
    return this.call(account, 'GET', 'https://sellercenter.lazada.vn/api/seller/orders', {
      created_after: startTime,
      created_before: endTime,
      limit: 50,
    });
  }

  async lazadaUpdatePrice(account: SellerAccount, skuId: string, price: number): Promise<any> {
    return this.call(account, 'POST', 'https://sellercenter.lazada.vn/api/seller/products/price', {
      sku_id: skuId,
      price,
    });
  }

  async lazadaUpdateStock(account: SellerAccount, skuId: string, quantity: number): Promise<any> {
    return this.call(account, 'POST', 'https://sellercenter.lazada.vn/api/seller/products/stock', {
      sku_id: skuId,
      quantity,
    });
  }

  // ── TikTok internal APIs ──────────────────────────────────────────────────

  async tiktokGetProducts(account: SellerAccount, pageToken = ''): Promise<any> {
    return this.call(account, 'GET', 'https://seller-vn.tiktok.com/api/v1/products', {
      page_size: 50,
      page_token: pageToken,
    });
  }

  async tiktokGetOrders(account: SellerAccount, createTimeGe: number, createTimeLt: number): Promise<any> {
    return this.call(account, 'GET', 'https://seller-vn.tiktok.com/api/v1/orders/search', {
      create_time_ge: createTimeGe,
      create_time_lt: createTimeLt,
      page_size: 50,
    });
  }

  async tiktokUpdatePrice(account: SellerAccount, productId: string, skuId: string, price: number): Promise<any> {
    return this.call(account, 'POST', `https://seller-vn.tiktok.com/api/v1/products/${productId}/prices`, {
      skus: [{ id: skuId, sale_price: price.toFixed(2) }],
    });
  }

  async tiktokUpdateStock(account: SellerAccount, productId: string, skuId: string, quantity: number): Promise<any> {
    return this.call(account, 'POST', `https://seller-vn.tiktok.com/api/v1/products/${productId}/stocks`, {
      skus: [{ id: skuId, seller_stock: [{ quantity }] }],
    });
  }

  // ── Sync products/orders (lưu vào DB) ────────────────────────────────────

  async syncShopeeProducts(account: SellerAccount): Promise<number> {
    let offset = 0;
    let synced = 0;
    while (true) {
      const res = await this.shopeeGetProducts(account, offset);
      const items = res?.items || res?.data?.items || [];
      if (!items.length) break;
      for (const p of items) {
        await this.upsertProduct(account, {
          platformProductId: p.item_id?.toString() || p.itemid?.toString() || '',
          name: p.name || p.item_name || '',
          status: SellerProductStatus.ACTIVE,
          price: Number(p.price || p.current_price || 0),
          stock: Number(p.stock || p.stock_info?.total_available_stock || 0),
          imageUrl: p.images?.[0]?.url || p.image?.url || '',
          sku: p.item_sku || '',
          productUrl: `https://shopee.vn/product/${account.shopId}/${p.item_id || p.itemid}`,
        });
        synced++;
      }
      const total = res?.total || res?.data?.total || 0;
      offset += 50;
      if (offset >= total) break;
    }
    await this.accountRepo.update(account.id, { lastSyncAt: new Date() });
    return synced;
  }

  async syncLazadaProducts(account: SellerAccount): Promise<number> {
    let offset = 0;
    let synced = 0;
    while (true) {
      const res = await this.lazadaGetProducts(account, offset);
      const items = res?.data?.list || res?.list || [];
      if (!items.length) break;
      for (const p of items) {
        await this.upsertProduct(account, {
          platformProductId: p.item_id?.toString() || p.sku_id?.toString() || '',
          name: p.attributes?.name || p.name || '',
          status: p.status === 'active' ? SellerProductStatus.ACTIVE : SellerProductStatus.INACTIVE,
          price: Number(p.price || p.sale_price || 0),
          stock: Number(p.Available || p.quantity || 0),
          imageUrl: p.images?.[0]?.url || '',
          sku: p.SellerSku || p.sku || '',
          productUrl: p.url || '',
        });
        synced++;
      }
      const total = res?.data?.total || res?.total || 0;
      offset += 50;
      if (offset >= total) break;
    }
    await this.accountRepo.update(account.id, { lastSyncAt: new Date() });
    return synced;
  }

  async syncTiktokProducts(account: SellerAccount): Promise<number> {
    let pageToken = '';
    let synced = 0;
    while (true) {
      const res = await this.tiktokGetProducts(account, pageToken);
      const items = res?.data?.products || res?.products || [];
      if (!items.length) break;
      for (const p of items) {
        const sku = p.skus?.[0] || {};
        await this.upsertProduct(account, {
          platformProductId: p.id || '',
          platformSkuId: sku.id || '',
          name: p.title || '',
          status: p.status === 'ACTIVATE' ? SellerProductStatus.ACTIVE : SellerProductStatus.INACTIVE,
          price: Number(sku.sale_price?.amount || sku.price?.amount || 0),
          stock: Number(sku.stock_info?.[0]?.available_stock || 0),
          imageUrl: p.main_images?.[0]?.url || p.images?.[0]?.url || '',
          sku: sku.seller_sku || '',
        });
        synced++;
      }
      pageToken = res?.data?.next_page_token || '';
      if (!pageToken || !res?.data?.has_more) break;
    }
    await this.accountRepo.update(account.id, { lastSyncAt: new Date() });
    return synced;
  }

  async syncShopeeOrders(account: SellerAccount, days = 7): Promise<number> {
    const timeFrom = Math.floor((Date.now() - days * 86400000) / 1000);
    const timeTo = Math.floor(Date.now() / 1000);
    const res = await this.shopeeGetOrders(account, timeFrom, timeTo);
    const orders = res?.data?.order_list || res?.order_list || [];
    let synced = 0;
    for (const o of orders) {
      await this.upsertOrder(account, {
        platformOrderId: o.order_sn || o.ordersn || '',
        status: this.mapShopeeOrderStatus(o.order_status),
        platformStatus: o.order_status,
        buyerName: o.buyer_username || '',
        totalAmount: Number(o.total_amount || 0),
        currency: 'VND',
        items: (o.item_list || []).map((i: any) => ({
          name: i.item_name || '',
          quantity: i.model_quantity_purchased || 1,
          unitPrice: i.model_discounted_price || 0,
        })),
        trackingNumber: o.package_list?.[0]?.tracking_no || '',
        shippingProvider: o.shipping_carrier || '',
        platformCreatedAt: o.create_time ? new Date(o.create_time * 1000) : null,
      });
      synced++;
    }
    return synced;
  }

  async syncLazadaOrders(account: SellerAccount, days = 7): Promise<number> {
    const now = new Date();
    const from = new Date(Date.now() - days * 86400000);
    const res = await this.lazadaGetOrders(account, from.toISOString(), now.toISOString());
    const orders = res?.data?.orders || res?.orders || [];
    let synced = 0;
    for (const o of orders) {
      await this.upsertOrder(account, {
        platformOrderId: o.order_id?.toString() || '',
        status: this.mapLazadaOrderStatus(o.status),
        platformStatus: o.status,
        buyerName: o.customer_name || '',
        totalAmount: Number(o.price || 0),
        currency: 'VND',
        items: (o.order_items || []).map((i: any) => ({
          name: i.name || '',
          quantity: 1,
          unitPrice: Number(i.item_price || 0),
        })),
        shippingProvider: o.logistic_name || '',
        trackingNumber: o.tracking_number || '',
        platformCreatedAt: o.created_at ? new Date(o.created_at) : null,
      });
      synced++;
    }
    return synced;
  }

  async syncTiktokOrders(account: SellerAccount, days = 7): Promise<number> {
    const createTimeGe = Math.floor((Date.now() - days * 86400000) / 1000);
    const createTimeLt = Math.floor(Date.now() / 1000);
    const res = await this.tiktokGetOrders(account, createTimeGe, createTimeLt);
    const orders = res?.data?.orders || res?.orders || [];
    let synced = 0;
    for (const o of orders) {
      await this.upsertOrder(account, {
        platformOrderId: o.id || '',
        status: this.mapTiktokOrderStatus(o.status),
        platformStatus: o.status,
        buyerName: o.buyer_info?.name || '',
        totalAmount: Number(o.payment?.total_amount || o.total_amount || 0),
        currency: 'VND',
        items: (o.line_items || []).map((i: any) => ({
          name: i.product_name || '',
          quantity: i.quantity || 1,
          unitPrice: Number(i.sale_price?.amount || 0),
        })),
        shippingProvider: o.shipping?.tracking_company || '',
        trackingNumber: o.shipping?.tracking_number || '',
        platformCreatedAt: o.create_time ? new Date(o.create_time * 1000) : null,
      });
      synced++;
    }
    return synced;
  }

  // ── Status maps ───────────────────────────────────────────────────────────

  private mapShopeeOrderStatus(s: string): SellerOrderStatus {
    const m: Record<string, SellerOrderStatus> = {
      UNPAID: SellerOrderStatus.PENDING,
      READY_TO_SHIP: SellerOrderStatus.CONFIRMED,
      PROCESSED: SellerOrderStatus.PROCESSING,
      SHIPPED: SellerOrderStatus.SHIPPED,
      COMPLETED: SellerOrderStatus.COMPLETED,
      CANCELLED: SellerOrderStatus.CANCELLED,
      IN_CANCEL: SellerOrderStatus.CANCELLED,
    };
    return m[s] || SellerOrderStatus.PENDING;
  }

  private mapLazadaOrderStatus(s: string): SellerOrderStatus {
    const m: Record<string, SellerOrderStatus> = {
      pending: SellerOrderStatus.PENDING,
      packed: SellerOrderStatus.CONFIRMED,
      ready_to_ship: SellerOrderStatus.CONFIRMED,
      shipped: SellerOrderStatus.SHIPPED,
      delivered: SellerOrderStatus.COMPLETED,
      canceled: SellerOrderStatus.CANCELLED,
    };
    return m[(s || '').toLowerCase()] || SellerOrderStatus.PENDING;
  }

  private mapTiktokOrderStatus(s: string): SellerOrderStatus {
    const m: Record<string, SellerOrderStatus> = {
      AWAITING_SHIPMENT: SellerOrderStatus.CONFIRMED,
      AWAITING_COLLECTION: SellerOrderStatus.PROCESSING,
      IN_TRANSIT: SellerOrderStatus.SHIPPED,
      DELIVERED: SellerOrderStatus.COMPLETED,
      COMPLETED: SellerOrderStatus.COMPLETED,
      CANCELLED: SellerOrderStatus.CANCELLED,
      UNPAID: SellerOrderStatus.PENDING,
      ON_HOLD: SellerOrderStatus.PENDING,
    };
    return m[s] || SellerOrderStatus.PENDING;
  }

  // ── DB upserts ────────────────────────────────────────────────────────────

  private async upsertProduct(account: SellerAccount, data: Partial<SellerProduct> & { platformProductId: string }) {
    const existing = await this.productRepo.findOne({
      where: { accountId: account.id, platformProductId: data.platformProductId },
    });
    const payload = { accountId: account.id, ...data };
    if (existing) {
      await this.productRepo.update(existing.id, payload);
    } else {
      await this.productRepo.save(this.productRepo.create(payload));
    }
  }

  private async upsertOrder(account: SellerAccount, data: Partial<SellerOrder> & { platformOrderId: string }) {
    const existing = await this.orderRepo.findOne({
      where: { accountId: account.id, platformOrderId: data.platformOrderId },
    });
    const payload = { accountId: account.id, ...data };
    if (existing) {
      await this.orderRepo.update(existing.id, payload);
    } else {
      await this.orderRepo.save(this.orderRepo.create(payload));
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(accountId: string) {
    const [totalProducts, activeProducts, orders] = await Promise.all([
      this.productRepo.count({ where: { accountId } }),
      this.productRepo.count({ where: { accountId, status: SellerProductStatus.ACTIVE } }),
      this.orderRepo.find({ where: { accountId }, order: { platformCreatedAt: 'DESC' }, take: 100 }),
    ]);
    const revenue = orders.filter(o => o.status === SellerOrderStatus.COMPLETED).reduce((s, o) => s + Number(o.sellerRevenue || o.totalAmount), 0);
    const pending = orders.filter(o => [SellerOrderStatus.PENDING, SellerOrderStatus.CONFIRMED].includes(o.status)).length;
    return { totalProducts, activeProducts, totalOrders: orders.length, revenue, pendingOrders: pending };
  }
}
