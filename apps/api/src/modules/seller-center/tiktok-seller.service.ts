import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import { SellerAccount, SellerPlatform, SellerAccountStatus } from './entities/seller-account.entity';
import { SellerProduct, SellerProductStatus } from './entities/seller-product.entity';
import { SellerOrder, SellerOrderStatus } from './entities/seller-order.entity';

@Injectable()
export class TiktokSellerService {
  private readonly logger = new Logger(TiktokSellerService.name);
  private readonly BASE_URL = 'https://open-api.tiktokglobalshop.com';
  private readonly APP_KEY = process.env.TIKTOK_SHOP_APP_KEY || '';
  private readonly APP_SECRET = process.env.TIKTOK_SHOP_APP_SECRET || '';

  constructor(
    @InjectRepository(SellerAccount) private readonly accountRepo: Repository<SellerAccount>,
    @InjectRepository(SellerProduct) private readonly productRepo: Repository<SellerProduct>,
    @InjectRepository(SellerOrder)   private readonly orderRepo: Repository<SellerOrder>,
  ) {}

  // ── OAuth ──────────────────────────────────────────────────────────────────

  getAuthUrl(state = 'tiktok'): string {
    const appKey = this.APP_KEY;
    if (!appKey) return '';
    return `https://auth.tiktok-shops.com/oauth/authorize?app_key=${appKey}&state=${state}`;
  }

  async exchangeToken(authCode: string): Promise<SellerAccount | null> {
    try {
      const res = await axios.get('https://auth.tiktok-shops.com/api/v2/token/get', {
        params: {
          app_key: this.APP_KEY,
          app_secret: this.APP_SECRET,
          auth_code: authCode,
          grant_type: 'authorized_code',
        },
      });

      const d = res.data?.data;
      if (!d?.access_token) return null;

      const shopInfo = await this.getShopInfo(d.access_token, d.open_id);
      const account = this.accountRepo.create({
        platform: SellerPlatform.TIKTOK,
        status: SellerAccountStatus.ACTIVE,
        accessToken: d.access_token,
        refreshToken: d.refresh_token,
        tokenExpiresAt: new Date(Date.now() + d.access_token_expire_in * 1000),
        sellerId: d.open_id,
        shopId: shopInfo?.shop_id || '',
        shopName: shopInfo?.shop_name || '',
        country: shopInfo?.region || 'VN',
      });
      return this.accountRepo.save(account);
    } catch (e: any) {
      this.logger.error(`TikTok exchange token: ${e.message}`);
      return null;
    }
  }

  async refreshAccessToken(account: SellerAccount): Promise<boolean> {
    try {
      const res = await axios.get('https://auth.tiktok-shops.com/api/v2/token/refresh', {
        params: {
          app_key: this.APP_KEY,
          app_secret: this.APP_SECRET,
          refresh_token: account.refreshToken,
          grant_type: 'refresh_token',
        },
      });
      const d = res.data?.data;
      if (!d?.access_token) return false;
      await this.accountRepo.update(account.id, {
        accessToken: d.access_token,
        refreshToken: d.refresh_token,
        tokenExpiresAt: new Date(Date.now() + d.access_token_expire_in * 1000),
        status: SellerAccountStatus.ACTIVE,
      });
      return true;
    } catch { return false; }
  }

  // ── API helper ────────────────────────────────────────────────────────────

  private sign(path: string, params: Record<string, string>, body = ''): string {
    const timestamp = params.timestamp;
    const sortedKeys = Object.keys(params).filter(k => !['sign', 'access_token'].includes(k)).sort();
    const paramStr = sortedKeys.map(k => `${k}${params[k]}`).join('');
    const input = `${this.APP_SECRET}${path}${paramStr}${body}${this.APP_SECRET}`;
    return crypto.createHmac('sha256', this.APP_SECRET).update(input).digest('hex');
  }

  private async call<T>(account: SellerAccount, method: 'GET' | 'POST', path: string, data?: any): Promise<T | null> {
    const token = account.accessToken;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const params: Record<string, string> = {
      app_key: this.APP_KEY,
      timestamp,
      shop_id: account.shopId,
    };
    const bodyStr = data ? JSON.stringify(data) : '';
    params.sign = this.sign(path, params, bodyStr);

    try {
      const res = await axios({
        method,
        url: `${this.BASE_URL}${path}`,
        params: { ...params, access_token: token },
        data: data || undefined,
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });
      if (res.data?.code !== 0) {
        this.logger.warn(`TikTok API ${path}: code=${res.data?.code} msg=${res.data?.message}`);
        return null;
      }
      return res.data?.data as T;
    } catch (e: any) {
      this.logger.error(`TikTok API ${path}: ${e.message}`);
      return null;
    }
  }

  private async getShopInfo(accessToken: string, openId: string): Promise<any> {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const path = '/api/shop/get_authorized_shop';
      const params: Record<string, string> = { app_key: this.APP_KEY, timestamp };
      params.sign = this.sign(path, params, '');
      const res = await axios.get(`${this.BASE_URL}${path}`, {
        params: { ...params, access_token: accessToken },
        timeout: 10000,
      });
      return res.data?.data?.shop_list?.[0] || null;
    } catch { return null; }
  }

  // ── Products ──────────────────────────────────────────────────────────────

  async syncProducts(account: SellerAccount): Promise<number> {
    let pageToken = '';
    let synced = 0;

    do {
      const res = await this.call<any>(account, 'POST', '/api/products/search', {
        page_size: 20,
        page_token: pageToken || undefined,
      });
      if (!res) break;

      const items: any[] = res.products || [];
      for (const p of items) {
        await this.upsertProduct(account, p);
        synced++;
      }
      pageToken = res.next_page_token || '';
    } while (pageToken);

    await this.accountRepo.update(account.id, { lastSyncAt: new Date() });
    this.logger.log(`TikTok sync ${account.shopName}: ${synced} sản phẩm`);
    return synced;
  }

  private async upsertProduct(account: SellerAccount, p: any) {
    const existing = await this.productRepo.findOne({
      where: { accountId: account.id, platformProductId: p.id },
    });
    const sku = p.skus?.[0];
    const price = Number(sku?.price?.original_price || sku?.price?.sale_price || 0);
    const stock = sku?.stock_infos?.reduce((s: number, si: any) => s + (si.available_stock || 0), 0) || 0;
    const data = {
      accountId: account.id,
      platformProductId: p.id,
      name: p.title || '',
      status: p.status === 'ACTIVATE' ? SellerProductStatus.ACTIVE : SellerProductStatus.INACTIVE,
      price,
      salePrice: Number(sku?.price?.sale_price || price),
      stock,
      sold: p.sales?.total || 0,
      imageUrl: p.main_images?.[0]?.urls?.[0] || '',
      images: (p.main_images || []).map((i: any) => i.urls?.[0]).filter(Boolean),
      category: p.category_chains?.map((c: any) => c.name).join(' > ') || '',
      categoryId: p.category_id || '',
      variants: p.skus || [],
      platformUpdatedAt: p.update_time ? new Date(p.update_time * 1000) : null,
    };
    if (existing) {
      await this.productRepo.update(existing.id, data);
    } else {
      await this.productRepo.save(this.productRepo.create(data));
    }
  }

  async updateProductPrice(account: SellerAccount, productId: string, skuId: string, price: number): Promise<boolean> {
    const res = await this.call<any>(account, 'POST', '/api/products/prices/update', {
      product_id: productId,
      skus: [{ id: skuId, price: { amount: price.toString(), currency: 'VND' } }],
    });
    return !!res;
  }

  async updateProductStock(account: SellerAccount, productId: string, skuId: string, stock: number): Promise<boolean> {
    const res = await this.call<any>(account, 'POST', '/api/products/stocks/update', {
      product_id: productId,
      skus: [{ id: skuId, stock_infos: [{ warehouse_id: 'default', available_stock: stock }] }],
    });
    return !!res;
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async syncOrders(account: SellerAccount, days = 7): Promise<number> {
    const createTimeFrom = Math.floor((Date.now() - days * 86400000) / 1000);
    let pageToken = '';
    let synced = 0;

    do {
      const res = await this.call<any>(account, 'POST', '/api/orders/search', {
        create_time_from: createTimeFrom,
        create_time_to: Math.floor(Date.now() / 1000),
        page_size: 20,
        page_token: pageToken || undefined,
      });
      if (!res) break;

      const orders: any[] = res.orders || [];
      for (const o of orders) await this.upsertOrder(account, o);
      synced += orders.length;
      pageToken = res.next_page_token || '';
    } while (pageToken);

    return synced;
  }

  private async upsertOrder(account: SellerAccount, o: any) {
    const existing = await this.orderRepo.findOne({
      where: { accountId: account.id, platformOrderId: o.id },
    });

    const statusMap: Record<string, SellerOrderStatus> = {
      UNPAID: SellerOrderStatus.PENDING,
      AWAITING_SHIPMENT: SellerOrderStatus.CONFIRMED,
      PARTIALLY_SHIPPING: SellerOrderStatus.PROCESSING,
      AWAITING_COLLECTION: SellerOrderStatus.PACKED,
      IN_TRANSIT: SellerOrderStatus.SHIPPED,
      DELIVERED: SellerOrderStatus.DELIVERED,
      COMPLETED: SellerOrderStatus.COMPLETED,
      CANCELLED: SellerOrderStatus.CANCELLED,
    };

    const data = {
      accountId: account.id,
      platformOrderId: o.id,
      status: statusMap[o.status] || SellerOrderStatus.PENDING,
      platformStatus: o.status,
      buyerName: o.recipient_address?.name || '',
      buyerPhone: o.recipient_address?.phone_number || '',
      shippingAddress: [o.recipient_address?.full_address, o.recipient_address?.city, o.recipient_address?.state].filter(Boolean).join(', '),
      totalAmount: Number(o.payment?.total_amount || 0),
      sellerRevenue: Number(o.payment?.seller_income || 0),
      currency: o.payment?.currency || 'VND',
      items: (o.line_items || []).map((li: any) => ({
        platformProductId: li.product_id,
        name: li.product_name,
        sku: li.sku_id,
        quantity: li.quantity,
        unitPrice: Number(li.sale_price || 0),
        subtotal: Number(li.sale_price || 0) * li.quantity,
        image: li.sku_image || '',
      })),
      trackingNumber: o.shipping_info?.tracking_number || '',
      shippingProvider: o.shipping_info?.shipping_provider || '',
      shippingFee: Number(o.payment?.shipping_fee || 0),
      rawData: o,
      platformCreatedAt: o.create_time ? new Date(o.create_time * 1000) : null,
      platformUpdatedAt: o.update_time ? new Date(o.update_time * 1000) : null,
    };

    if (existing) {
      await this.orderRepo.update(existing.id, data);
    } else {
      await this.orderRepo.save(this.orderRepo.create(data));
    }
  }

  async confirmOrderShipment(account: SellerAccount, orderId: string): Promise<boolean> {
    const res = await this.call<any>(account, 'POST', '/api/fulfillment/ship_package', {
      order_id: orderId,
    });
    return !!res;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(accountId: string) {
    const [totalProducts, activeProducts, orders] = await Promise.all([
      this.productRepo.count({ where: { accountId } }),
      this.productRepo.count({ where: { accountId, status: SellerProductStatus.ACTIVE } }),
      this.orderRepo.find({ where: { accountId }, order: { platformCreatedAt: 'DESC' }, take: 100 }),
    ]);
    const revenue = orders.filter(o => o.status === SellerOrderStatus.COMPLETED).reduce((s, o) => s + Number(o.sellerRevenue), 0);
    const pending = orders.filter(o => [SellerOrderStatus.PENDING, SellerOrderStatus.CONFIRMED].includes(o.status)).length;
    return { totalProducts, activeProducts, totalOrders: orders.length, revenue, pendingOrders: pending };
  }
}
