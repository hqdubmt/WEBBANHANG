import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import { SellerAccount, SellerPlatform, SellerAccountStatus } from './entities/seller-account.entity';
import { SellerProduct, SellerProductStatus } from './entities/seller-product.entity';
import { SellerOrder, SellerOrderStatus } from './entities/seller-order.entity';

@Injectable()
export class LazadaSellerService {
  private readonly logger = new Logger(LazadaSellerService.name);
  private readonly BASE_URL = 'https://api.lazada.vn/rest';
  private readonly AUTH_URL = 'https://auth.lazada.com/oauth/authorize';
  private readonly TOKEN_URL = 'https://auth.lazada.com/rest/auth/token/create';
  private readonly APP_KEY = process.env.LAZADA_APP_KEY || '';
  private readonly APP_SECRET = process.env.LAZADA_APP_SECRET || '';

  constructor(
    @InjectRepository(SellerAccount) private readonly accountRepo: Repository<SellerAccount>,
    @InjectRepository(SellerProduct) private readonly productRepo: Repository<SellerProduct>,
    @InjectRepository(SellerOrder)   private readonly orderRepo: Repository<SellerOrder>,
  ) {}

  // ── OAuth ──────────────────────────────────────────────────────────────────

  getAuthUrl(redirectUri: string): string {
    if (!this.APP_KEY) return '';
    return `${this.AUTH_URL}?response_type=code&force_auth=true&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${this.APP_KEY}`;
  }

  async exchangeToken(code: string): Promise<SellerAccount | null> {
    try {
      const params = this.buildParams('/auth/token/create', { code });
      const res = await axios.get(this.TOKEN_URL, { params, timeout: 10000 });
      const d = res.data;
      if (!d?.access_token) return null;

      const account = this.accountRepo.create({
        platform: SellerPlatform.LAZADA,
        status: SellerAccountStatus.ACTIVE,
        accessToken: d.access_token,
        refreshToken: d.refresh_token,
        tokenExpiresAt: new Date(Date.now() + d.expires_in * 1000),
        sellerId: d.account_platform,
        country: d.country || 'vn',
        meta: { accountType: d.account_type },
      });

      const saved = await this.accountRepo.save(account);

      // Lấy shop info
      const shopInfo = await this.getSellerInfo(saved);
      if (shopInfo) {
        await this.accountRepo.update(saved.id, {
          shopName: shopInfo.shopName,
          shopId: shopInfo.shopId,
        });
        saved.shopName = shopInfo.shopName;
      }
      return saved;
    } catch (e: any) {
      this.logger.error(`Lazada exchange token: ${e.message}`);
      return null;
    }
  }

  async refreshAccessToken(account: SellerAccount): Promise<boolean> {
    try {
      const params = this.buildParams('/auth/token/refresh', { refresh_token: account.refreshToken });
      const res = await axios.get(this.TOKEN_URL.replace('create', 'refresh'), { params, timeout: 10000 });
      const d = res.data;
      if (!d?.access_token) return false;
      await this.accountRepo.update(account.id, {
        accessToken: d.access_token,
        refreshToken: d.refresh_token,
        tokenExpiresAt: new Date(Date.now() + d.expires_in * 1000),
        status: SellerAccountStatus.ACTIVE,
      });
      return true;
    } catch { return false; }
  }

  // ── API helper ─────────────────────────────────────────────────────────────

  private buildParams(apiPath: string, extra: Record<string, string> = {}): Record<string, string> {
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      app_key: this.APP_KEY,
      timestamp,
      sign_method: 'sha256',
      ...extra,
    };
    const sortedKeys = Object.keys(params).sort();
    const paramStr = sortedKeys.map(k => `${k}${params[k]}`).join('');
    const base = apiPath + paramStr;
    params.sign = crypto.createHmac('sha256', this.APP_SECRET).update(base).digest('hex').toUpperCase();
    return params;
  }

  private async call<T>(account: SellerAccount, path: string, extra: Record<string, string> = {}): Promise<T | null> {
    const params = this.buildParams(path, { access_token: account.accessToken, ...extra });
    try {
      const res = await axios.get(`${this.BASE_URL}${path}`, { params, timeout: 15000 });
      if (res.data?.code && res.data.code !== '0') {
        this.logger.warn(`Lazada ${path}: ${res.data.code} ${res.data.message}`);
        return null;
      }
      return (res.data?.data || res.data) as T;
    } catch (e: any) {
      this.logger.error(`Lazada ${path}: ${e.message}`);
      return null;
    }
  }

  private async getSellerInfo(account: SellerAccount): Promise<{ shopName: string; shopId: string } | null> {
    const res = await this.call<any>(account, '/seller/get');
    if (!res) return null;
    return { shopName: res.name || '', shopId: res.id?.toString() || '' };
  }

  // ── Products ──────────────────────────────────────────────────────────────

  async syncProducts(account: SellerAccount): Promise<number> {
    let offset = 0;
    const limit = 50;
    let synced = 0;

    while (true) {
      const res = await this.call<any>(account, '/products/get', {
        filter: 'all',
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (!res?.products?.length) break;

      for (const p of res.products) {
        await this.upsertProduct(account, p);
        synced++;
      }

      if (res.products.length < limit) break;
      offset += limit;
    }

    await this.accountRepo.update(account.id, { lastSyncAt: new Date() });
    this.logger.log(`Lazada sync ${account.shopName}: ${synced} sản phẩm`);
    return synced;
  }

  private async upsertProduct(account: SellerAccount, p: any) {
    const existing = await this.productRepo.findOne({
      where: { accountId: account.id, platformProductId: p.item_id?.toString() },
    });

    const sku = p.skus?.[0];
    const statusMap: Record<string, SellerProductStatus> = {
      active: SellerProductStatus.ACTIVE,
      inactive: SellerProductStatus.INACTIVE,
      deleted: SellerProductStatus.DELETED,
      banned: SellerProductStatus.BANNED,
    };

    const data = {
      accountId: account.id,
      platformProductId: p.item_id?.toString() || '',
      platformSkuId: sku?.ShopSku || sku?.SellerSku || '',
      name: p.attributes?.name || '',
      status: statusMap[p.status?.toLowerCase()] || SellerProductStatus.INACTIVE,
      price: Number(sku?.price || 0),
      salePrice: Number(sku?.special_price || sku?.price || 0),
      stock: Number(sku?.quantity || 0),
      sold: Number(p.statistics?.sold_info?.total || 0),
      imageUrl: p.images?.[0] || '',
      images: p.images || [],
      sku: sku?.SellerSku || '',
      category: p.primary_category?.display_name || '',
      categoryId: p.primary_category?.id?.toString() || '',
      variants: p.skus || [],
      productUrl: `https://www.lazada.vn/products/${p.item_id}.html`,
      rating: Number(p.statistics?.rating_score || 0),
      reviewCount: Number(p.statistics?.review_count || 0),
      platformUpdatedAt: p.updated_time ? new Date(p.updated_time) : null,
    };

    if (existing) {
      await this.productRepo.update(existing.id, data);
    } else {
      await this.productRepo.save(this.productRepo.create(data));
    }
  }

  async updateProductPrice(account: SellerAccount, skuId: string, price: number, salePrice?: number): Promise<boolean> {
    const payload = {
      skuId,
      price: price.toString(),
      ...(salePrice ? { specialPrice: salePrice.toString() } : {}),
    };
    const res = await this.call<any>(account, '/product/price/update', payload as any);
    return !!res;
  }

  async updateProductStock(account: SellerAccount, skuId: string, stock: number): Promise<boolean> {
    const res = await this.call<any>(account, '/product/stock/update', {
      skuId,
      quantity: stock.toString(),
    });
    return !!res;
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async syncOrders(account: SellerAccount, days = 7): Promise<number> {
    const createdAfter = new Date(Date.now() - days * 86400000).toISOString();
    let offset = 0;
    const limit = 50;
    let synced = 0;

    while (true) {
      const res = await this.call<any>(account, '/orders/get', {
        created_after: createdAfter,
        limit: limit.toString(),
        offset: offset.toString(),
        sort_by: 'updated_at',
        sort_direction: 'DESC',
      });
      if (!res?.orders?.length) break;

      for (const o of res.orders) await this.upsertOrder(account, o);
      synced += res.orders.length;
      if (res.orders.length < limit) break;
      offset += limit;
    }

    return synced;
  }

  private async upsertOrder(account: SellerAccount, o: any) {
    const existing = await this.orderRepo.findOne({
      where: { accountId: account.id, platformOrderId: o.order_id?.toString() },
    });

    const statusMap: Record<string, SellerOrderStatus> = {
      pending: SellerOrderStatus.PENDING,
      unpaid: SellerOrderStatus.PENDING,
      ready_to_ship: SellerOrderStatus.CONFIRMED,
      shipped: SellerOrderStatus.SHIPPED,
      delivered: SellerOrderStatus.DELIVERED,
      failed_delivery: SellerOrderStatus.RETURNED,
      returned: SellerOrderStatus.RETURNED,
      canceled: SellerOrderStatus.CANCELLED,
    };

    const data = {
      accountId: account.id,
      platformOrderId: o.order_id?.toString() || '',
      status: statusMap[o.statuses?.[0]?.toLowerCase()] || SellerOrderStatus.PENDING,
      platformStatus: o.statuses?.[0] || '',
      buyerName: o.address_billing?.first_name + ' ' + o.address_billing?.last_name,
      buyerPhone: o.address_billing?.phone || '',
      shippingAddress: [o.address_shipping?.address1, o.address_shipping?.city, o.address_shipping?.country].filter(Boolean).join(', '),
      totalAmount: Number(o.price || 0),
      sellerRevenue: Number(o.price || 0),
      currency: o.currency || 'VND',
      items: (o.items || []).map((i: any) => ({
        platformProductId: i.item_id?.toString(),
        name: i.name || '',
        sku: i.sku || '',
        quantity: Number(i.quantity || 1),
        unitPrice: Number(i.paid_price || 0),
        subtotal: Number(i.paid_price || 0) * Number(i.quantity || 1),
        image: i.product_main_image || '',
      })),
      trackingNumber: o.tracking_code || '',
      shippingProvider: o.shipping_provider || '',
      shippingFee: Number(o.shipping_fee || 0),
      rawData: o,
      platformCreatedAt: o.created_at ? new Date(o.created_at) : null,
      platformUpdatedAt: o.updated_at ? new Date(o.updated_at) : null,
    };

    if (existing) {
      await this.orderRepo.update(existing.id, data);
    } else {
      await this.orderRepo.save(this.orderRepo.create(data));
    }
  }

  async setOrderStatusToReadyToShip(account: SellerAccount, orderId: string, orderItemIds: string[], deliveryType: string, shippingProvider: string): Promise<boolean> {
    const res = await this.call<any>(account, '/order/rts', {
      order_id: orderId,
      delivery_type: deliveryType || 'dropship',
      shipping_provider: shippingProvider || '',
      order_item_ids: JSON.stringify(orderItemIds),
    } as any);
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
