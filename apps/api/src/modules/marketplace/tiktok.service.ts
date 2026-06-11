import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface TiktokProduct {
  productId: string;
  name: string;
  price: number;
  commissionRate: number;
  image: string;
  sales: number;
  affiliateLink: string;
  category: string;
  shopName: string;
  rating: number;
}

@Injectable()
export class TiktokService {
  private readonly logger = new Logger(TiktokService.name);
  private readonly BASE_URL = 'https://open-api.tiktokglobalshop.com';
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly accessToken: string;
  private readonly http: AxiosInstance;

  constructor() {
    this.appKey = process.env.TIKTOK_APP_KEY || '';
    this.appSecret = process.env.TIKTOK_APP_SECRET || '';
    this.accessToken = process.env.TIKTOK_ACCESS_TOKEN || '';
    this.http = axios.create({ baseURL: this.BASE_URL, timeout: 15000 });
  }

  get isConfigured(): boolean {
    return !!(this.appKey && this.appSecret && this.accessToken);
  }

  // Tạo chữ ký theo chuẩn TikTok Shop API v2
  private sign(path: string, params: Record<string, string>, body = ''): string {
    const sortedKeys = Object.keys(params).sort();
    const paramStr = sortedKeys.map((k) => `${k}${params[k]}`).join('');
    const payload = `${this.appSecret}${path}${paramStr}${body}${this.appSecret}`;
    return crypto.createHmac('sha256', this.appSecret).update(payload).digest('hex');
  }

  private buildHeaders(): Record<string, string> {
    return {
      'x-tts-access-token': this.accessToken,
      'Content-Type': 'application/json',
    };
  }

  private buildParams(path: string, extra: Record<string, string> = {}): Record<string, string> {
    const params: Record<string, string> = {
      app_key: this.appKey,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      ...extra,
    };
    params.sign = this.sign(path, params);
    return params;
  }

  // Tìm sản phẩm affiliate theo keyword
  async searchProducts(keyword: string, limit = 20): Promise<TiktokProduct[]> {
    if (!this.isConfigured) {
      this.logger.warn('TikTok: chưa cấu hình TIKTOK_APP_KEY / TIKTOK_APP_SECRET / TIKTOK_ACCESS_TOKEN');
      return [];
    }

    const path = '/api/affiliate/products/search';
    const body = JSON.stringify({
      keyword,
      page_size: Math.min(limit, 100),
      page_number: 1,
      sort_by: 'BEST_SELLER',
    });

    const params = this.buildParams(path, {});

    try {
      const res = await this.http.post(path, body, {
        params,
        headers: this.buildHeaders(),
      });

      const products = res.data?.data?.products || [];
      return products.map((p: any) => ({
        productId: p.product_id || '',
        name: p.product_title || p.product_name || '',
        price: parseFloat(p.price?.min_price || p.price || '0'),
        commissionRate: parseFloat(p.commission_rate || '0'),
        image: p.product_images?.[0] || p.cover_image || '',
        sales: parseInt(p.sales_count || '0'),
        affiliateLink: p.product_link || '',
        category: p.category_name || keyword,
        shopName: p.shop_name || '',
        rating: parseFloat(p.rating || '0'),
      }));
    } catch (e) {
      this.logger.error(`TikTok search "${keyword}" lỗi: ${e.message}`);
      return [];
    }
  }

  // Lấy sản phẩm hot trending trên TikTok Shop
  async getTrendingProducts(limit = 50): Promise<TiktokProduct[]> {
    if (!this.isConfigured) return [];

    const path = '/api/affiliate/products/recommend';
    const body = JSON.stringify({
      page_size: Math.min(limit, 100),
      page_number: 1,
      sort_by: 'COMMISSION_RATE',
    });

    const params = this.buildParams(path, {});

    try {
      const res = await this.http.post(path, body, {
        params,
        headers: this.buildHeaders(),
      });

      const products = res.data?.data?.products || [];
      return products.map((p: any) => ({
        productId: p.product_id || '',
        name: p.product_title || p.product_name || '',
        price: parseFloat(p.price?.min_price || p.price || '0'),
        commissionRate: parseFloat(p.commission_rate || '0'),
        image: p.product_images?.[0] || p.cover_image || '',
        sales: parseInt(p.sales_count || '0'),
        affiliateLink: p.product_link || '',
        category: p.category_name || '',
        shopName: p.shop_name || '',
        rating: parseFloat(p.rating || '0'),
      }));
    } catch (e) {
      this.logger.error(`TikTok trending lỗi: ${e.message}`);
      return [];
    }
  }

  // Tạo affiliate link từ product_id
  async generateAffiliateLink(productId: string): Promise<string | null> {
    if (!this.isConfigured) return null;

    const path = '/api/affiliate/link/generate';
    const body = JSON.stringify({ product_id: productId });
    const params = this.buildParams(path, {});

    try {
      const res = await this.http.post(path, body, {
        params,
        headers: this.buildHeaders(),
      });
      return res.data?.data?.affiliate_link || null;
    } catch (e) {
      this.logger.error(`TikTok gen link lỗi: ${e.message}`);
      return null;
    }
  }

  // Lấy OAuth Access Token từ authorization code
  static async getAccessToken(appKey: string, appSecret: string, code: string): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const params: Record<string, string> = { app_key: appKey, code, timestamp };
    const sortedKeys = Object.keys(params).sort();
    const paramStr = sortedKeys.map((k) => `${k}${params[k]}`).join('');
    const sign = crypto
      .createHmac('sha256', appSecret)
      .update(`${appSecret}/api/token/getAccessToken${paramStr}${appSecret}`)
      .digest('hex');

    const res = await axios.post('https://auth.tiktok-shops.com/api/token/getAccessToken', null, {
      params: { ...params, sign },
    });
    return res.data;
  }
}
