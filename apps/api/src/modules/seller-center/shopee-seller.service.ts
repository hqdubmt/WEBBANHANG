import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import { SellerAccount, SellerPlatform, SellerAccountStatus } from './entities/seller-account.entity';
import { SellerProduct, SellerProductStatus } from './entities/seller-product.entity';
import { SellerOrder, SellerOrderStatus } from './entities/seller-order.entity';

@Injectable()
export class ShopeeSellerService {
  private readonly logger = new Logger(ShopeeSellerService.name);
  private readonly BASE_URL = 'https://partner.shopeemobile.com';
  private readonly PARTNER_ID = process.env.SHOPEE_PARTNER_ID || process.env.SHOPEE_APP_ID || '';
  private readonly PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || process.env.SHOPEE_SECRET || '';

  constructor(
    @InjectRepository(SellerAccount) private readonly accountRepo: Repository<SellerAccount>,
    @InjectRepository(SellerProduct) private readonly productRepo: Repository<SellerProduct>,
    @InjectRepository(SellerOrder)   private readonly orderRepo: Repository<SellerOrder>,
  ) {}

  // ── OAuth ──────────────────────────────────────────────────────────────────

  getAuthUrl(redirectUri: string): string {
    if (!this.PARTNER_ID || !this.PARTNER_KEY) return '';
    const ts = Math.floor(Date.now() / 1000);
    const path = '/api/v2/shop/auth_partner';
    const baseStr = `${this.PARTNER_ID}${path}${ts}`;
    const sign = crypto.createHmac('sha256', this.PARTNER_KEY).update(baseStr).digest('hex');
    return `${this.BASE_URL}${path}?partner_id=${this.PARTNER_ID}&timestamp=${ts}&sign=${sign}&redirect=${encodeURIComponent(redirectUri)}`;
  }

  async exchangeToken(code: string, shopId: number): Promise<SellerAccount | null> {
    try {
      const path = '/api/v2/auth/token/get';
      const ts = Math.floor(Date.now() / 1000);
      const sign = this.sign(path, ts);
      const res = await axios.post(`${this.BASE_URL}${path}`, {
        code, shop_id: shopId, partner_id: Number(this.PARTNER_ID),
      }, {
        params: { partner_id: this.PARTNER_ID, timestamp: ts, sign },
        timeout: 10000,
      });

      const d = res.data;
      if (!d?.access_token) return null;

      const account = this.accountRepo.create({
        platform: SellerPlatform.SHOPEE,
        status: SellerAccountStatus.ACTIVE,
        accessToken: d.access_token,
        refreshToken: d.refresh_token,
        tokenExpiresAt: new Date(Date.now() + d.expire_in * 1000),
        shopId: shopId.toString(),
        partnerId: this.PARTNER_ID,
        country: 'VN',
      });
      const saved = await this.accountRepo.save(account);

      const info = await this.getShopInfo(saved);
      if (info) {
        await this.accountRepo.update(saved.id, { shopName: info.shop_name });
        saved.shopName = info.shop_name;
      }
      return saved;
    } catch (e: any) {
      this.logger.error(`Shopee exchange token: ${e.message}`);
      return null;
    }
  }

  async refreshAccessToken(account: SellerAccount): Promise<boolean> {
    try {
      const path = '/api/v2/auth/access_token/get';
      const ts = Math.floor(Date.now() / 1000);
      const res = await axios.post(`${this.BASE_URL}${path}`, {
        refresh_token: account.refreshToken,
        partner_id: Number(this.PARTNER_ID),
        shop_id: Number(account.shopId),
      }, {
        params: { partner_id: this.PARTNER_ID, timestamp: ts, sign: this.sign(path, ts) },
        timeout: 10000,
      });
      const d = res.data;
      if (!d?.access_token) return false;
      await this.accountRepo.update(account.id, {
        accessToken: d.access_token,
        refreshToken: d.refresh_token,
        tokenExpiresAt: new Date(Date.now() + d.expire_in * 1000),
        status: SellerAccountStatus.ACTIVE,
      });
      return true;
    } catch { return false; }
  }

  // ── API helper ─────────────────────────────────────────────────────────────

  private sign(path: string, timestamp: number, accessToken?: string, shopId?: string): string {
    const base = accessToken
      ? `${this.PARTNER_ID}${path}${timestamp}${accessToken}${shopId}`
      : `${this.PARTNER_ID}${path}${timestamp}`;
    return crypto.createHmac('sha256', this.PARTNER_KEY).update(base).digest('hex');
  }

  private async call<T>(account: SellerAccount, method: 'GET' | 'POST', path: string, data?: any): Promise<T | null> {
    const ts = Math.floor(Date.now() / 1000);
    const sign = this.sign(path, ts, account.accessToken, account.shopId);
    const params = {
      partner_id: Number(this.PARTNER_ID),
      shop_id: Number(account.shopId),
      access_token: account.accessToken,
      timestamp: ts,
      sign,
    };
    try {
      const res = await axios({ method, url: `${this.BASE_URL}${path}`, params, data, timeout: 15000 });
      if (res.data?.error && res.data.error !== '') {
        this.logger.warn(`Shopee ${path}: ${res.data.error} — ${res.data.message}`);
        return null;
      }
      return res.data?.response as T;
    } catch (e: any) {
      this.logger.error(`Shopee ${path}: ${e.message}`);
      return null;
    }
  }

  private async getShopInfo(account: SellerAccount): Promise<any> {
    return this.call<any>(account, 'GET', '/api/v2/shop/get_shop_info');
  }

  // ── Products ──────────────────────────────────────────────────────────────

  async syncProducts(account: SellerAccount): Promise<number> {
    let offset = 0;
    const pageSize = 50;
    let synced = 0;

    while (true) {
      const res = await this.call<any>(account, 'GET', '/api/v2/product/get_item_list', {
        offset, page_size: pageSize, item_status: 'NORMAL',
      } as any);
      if (!res?.item?.length) break;

      // Lấy chi tiết từng batch
      const ids: number[] = res.item.map((i: any) => i.item_id);
      const detail = await this.call<any>(account, 'GET', '/api/v2/product/get_item_base_info', {
        item_id_list: ids.join(','),
      } as any);

      for (const p of detail?.item_list || []) {
        await this.upsertProduct(account, p);
        synced++;
      }

      if (!res.has_next_page) break;
      offset += pageSize;
    }

    await this.accountRepo.update(account.id, { lastSyncAt: new Date() });
    this.logger.log(`Shopee sync ${account.shopName}: ${synced} sản phẩm`);
    return synced;
  }

  private async upsertProduct(account: SellerAccount, p: any) {
    const existing = await this.productRepo.findOne({
      where: { accountId: account.id, platformProductId: p.item_id?.toString() },
    });

    const model = p.model?.[0];
    const price = Number(model?.price_info?.[0]?.current_price || p.price_info?.[0]?.current_price || 0);
    const stock = (p.stock_info_v2?.summary_info?.total_available_stock) || 0;

    const statusMap: Record<string, SellerProductStatus> = {
      NORMAL: SellerProductStatus.ACTIVE,
      BANNED: SellerProductStatus.BANNED,
      DELETED: SellerProductStatus.DELETED,
      UNLIST: SellerProductStatus.INACTIVE,
    };

    const data = {
      accountId: account.id,
      platformProductId: p.item_id?.toString() || '',
      name: p.item_name || '',
      status: statusMap[p.item_status] || SellerProductStatus.INACTIVE,
      price,
      salePrice: price,
      stock: Number(stock),
      imageUrl: p.image?.image_url_list?.[0] || '',
      images: p.image?.image_url_list || [],
      sku: p.item_sku || '',
      category: p.category_id?.toString() || '',
      categoryId: p.category_id?.toString() || '',
      variants: p.model || [],
      productUrl: `https://shopee.vn/product/${account.shopId}/${p.item_id}`,
      rating: Number(p.rating_star || 0),
      reviewCount: Number(p.comment_count || 0),
      weight: Number(p.weight || 0),
      platformUpdatedAt: p.update_time ? new Date(p.update_time * 1000) : null,
    };

    if (existing) {
      await this.productRepo.update(existing.id, data);
    } else {
      await this.productRepo.save(this.productRepo.create(data));
    }
  }

  async updateProductPrice(account: SellerAccount, itemId: number, modelId: number | null, price: number): Promise<boolean> {
    const res = await this.call<any>(account, 'POST', '/api/v2/product/update_price', {
      item_id: itemId,
      price_list: [{ model_id: modelId || 0, original_price: price }],
    });
    return !!res;
  }

  async updateProductStock(account: SellerAccount, itemId: number, modelId: number | null, stock: number, locationId?: string): Promise<boolean> {
    const res = await this.call<any>(account, 'POST', '/api/v2/product/update_stock', {
      item_id: itemId,
      stock_list: [{ model_id: modelId || 0, normal_stock: stock }],
    });
    return !!res;
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async syncOrders(account: SellerAccount, days = 7): Promise<number> {
    const timeFrom = Math.floor((Date.now() - days * 86400000) / 1000);
    const timeTo = Math.floor(Date.now() / 1000);
    let cursor = '';
    let synced = 0;

    while (true) {
      const res = await this.call<any>(account, 'GET', '/api/v2/order/get_order_list', {
        time_range_field: 'create_time',
        time_from: timeFrom,
        time_to: timeTo,
        page_size: 50,
        cursor,
      } as any);
      if (!res?.order_list?.length) break;

      const orderSns: string[] = res.order_list.map((o: any) => o.order_sn);

      // Lấy chi tiết từng batch 20 orders
      for (let i = 0; i < orderSns.length; i += 20) {
        const batch = orderSns.slice(i, i + 20);
        const detail = await this.call<any>(account, 'GET', '/api/v2/order/get_order_detail', {
          order_sn_list: batch.join(','),
          response_optional_fields: 'buyer_user_id,buyer_username,estimated_shipping_fee,recipient_address,actual_shipping_fee,goods_to_declare,note,note_update_time,item_list,pay_time,dropshipper,dropshipper_phone,split_up,buyer_cancel_reason,cancel_by,cancel_reason,actual_shipping_fee_confirmed,buyer_cpf_id,fulfillment_flag,pickup_done_time,package_list,shipping_carrier,payment_method,total_amount,buyer_username,invoice_data,checkout_shipping_carrier,reverse_shipping_fee,order_chargeable_weight_gram',
        } as any);

        for (const o of detail?.order_list || []) {
          await this.upsertOrder(account, o);
          synced++;
        }
      }

      if (!res.more) break;
      cursor = res.next_cursor || '';
    }

    return synced;
  }

  private async upsertOrder(account: SellerAccount, o: any) {
    const existing = await this.orderRepo.findOne({
      where: { accountId: account.id, platformOrderId: o.order_sn },
    });

    const statusMap: Record<string, SellerOrderStatus> = {
      UNPAID: SellerOrderStatus.PENDING,
      READY_TO_SHIP: SellerOrderStatus.CONFIRMED,
      PROCESSED: SellerOrderStatus.PROCESSING,
      SHIPPED: SellerOrderStatus.SHIPPED,
      COMPLETED: SellerOrderStatus.COMPLETED,
      IN_CANCEL: SellerOrderStatus.CANCELLED,
      CANCELLED: SellerOrderStatus.CANCELLED,
      INVOICE_PENDING: SellerOrderStatus.PENDING,
    };

    const addr = o.recipient_address || {};
    const data = {
      accountId: account.id,
      platformOrderId: o.order_sn,
      status: statusMap[o.order_status] || SellerOrderStatus.PENDING,
      platformStatus: o.order_status,
      buyerName: o.buyer_username || '',
      shippingAddress: [addr.full_address, addr.city, addr.state].filter(Boolean).join(', '),
      totalAmount: Number(o.total_amount || 0),
      sellerRevenue: Number(o.total_amount || 0),
      currency: 'VND',
      items: (o.item_list || []).map((i: any) => ({
        platformProductId: i.item_id?.toString(),
        name: i.item_name || '',
        sku: i.model_sku || i.item_sku || '',
        quantity: Number(i.model_quantity_purchased || 1),
        unitPrice: Number(i.model_discounted_price || i.model_original_price || 0),
        subtotal: Number(i.model_discounted_price || 0) * Number(i.model_quantity_purchased || 1),
        image: i.image_info?.image_url || '',
      })),
      trackingNumber: o.package_list?.[0]?.tracking_no || '',
      shippingProvider: o.shipping_carrier || '',
      shippingFee: Number(o.actual_shipping_fee || o.estimated_shipping_fee || 0),
      cancelReason: o.cancel_reason || o.buyer_cancel_reason || '',
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

  async shipOrder(account: SellerAccount, orderSn: string, packageNumber?: string): Promise<boolean> {
    const res = await this.call<any>(account, 'POST', '/api/v2/logistics/ship_order', {
      order_sn: orderSn,
      package_number: packageNumber || undefined,
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
