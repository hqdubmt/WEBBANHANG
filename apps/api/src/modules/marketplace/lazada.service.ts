import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface LazadaProduct {
  itemId: string;
  name: string;
  price: number;
  salePrice: number;
  image: string;
  sales: number;
  commission: number;
  affiliateLink: string;
  category: string;
  shopName: string;
  rating: number;
  url: string;
}

@Injectable()
export class LazadaService {
  private readonly logger = new Logger(LazadaService.name);
  private readonly BASE_URL = 'https://api.lazada.vn/rest';
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly accessToken: string;
  private readonly http: AxiosInstance;

  constructor() {
    this.appKey = process.env.LAZADA_APP_KEY || '';
    this.appSecret = process.env.LAZADA_APP_SECRET || '';
    this.accessToken = process.env.LAZADA_ACCESS_TOKEN || '';
    this.http = axios.create({ baseURL: this.BASE_URL, timeout: 15000 });
  }

  get isConfigured(): boolean {
    return !!(this.appKey && this.appSecret && this.accessToken);
  }

  // Tạo chữ ký theo chuẩn Lazada Open Platform
  private sign(apiPath: string, params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    const paramStr = sortedKeys.map((k) => `${k}${params[k]}`).join('');
    const base = apiPath + paramStr;
    return crypto.createHmac('sha256', this.appSecret).update(base).digest('hex').toUpperCase();
  }

  private buildParams(apiPath: string, extra: Record<string, string> = {}): Record<string, string> {
    const params: Record<string, string> = {
      app_key: this.appKey,
      access_token: this.accessToken,
      timestamp: Date.now().toString(),
      sign_method: 'sha256',
      ...extra,
    };
    params.sign = this.sign(apiPath, params);
    return params;
  }

  // Tìm sản phẩm affiliate theo keyword
  async searchProducts(keyword: string, limit = 20): Promise<LazadaProduct[]> {
    if (!this.isConfigured) {
      this.logger.warn('Lazada: chưa cấu hình LAZADA_APP_KEY / LAZADA_APP_SECRET / LAZADA_ACCESS_TOKEN');
      return [];
    }

    const apiPath = '/affiliate/products/query';
    const params = this.buildParams(apiPath, {
      keywords: keyword,
      page_size: Math.min(limit, 50).toString(),
      page_no: '1',
      sort_by: 'SALES_VOLUME',
    });

    try {
      const res = await this.http.get(apiPath, { params });
      const items = res.data?.data?.products || [];
      return items.map((item: any) => ({
        itemId: item.item_id?.toString() || '',
        name: item.product_name || '',
        price: parseFloat(item.price_min || '0'),
        salePrice: parseFloat(item.sale_price_min || item.price_min || '0'),
        image: item.image || '',
        sales: parseInt(item.sold_num || '0'),
        commission: parseFloat(item.commission_rate || '0'),
        affiliateLink: item.offer_link || '',
        category: item.first_level_category_name || keyword,
        shopName: item.shop_name || '',
        rating: parseFloat(item.rating || '0'),
        url: item.product_url || '',
      }));
    } catch (e) {
      this.logger.error(`Lazada search "${keyword}" lỗi: ${e.message}`);
      return [];
    }
  }

  // Lấy sản phẩm hot (flash sale / top seller)
  async getTopProducts(limit = 50): Promise<LazadaProduct[]> {
    if (!this.isConfigured) return [];

    const apiPath = '/affiliate/products/query';
    const params = this.buildParams(apiPath, {
      page_size: Math.min(limit, 50).toString(),
      page_no: '1',
      sort_by: 'COMMISSION_RATE',  // ưu tiên hoa hồng cao
    });

    try {
      const res = await this.http.get(apiPath, { params });
      const items = res.data?.data?.products || [];
      return items.map((item: any) => ({
        itemId: item.item_id?.toString() || '',
        name: item.product_name || '',
        price: parseFloat(item.price_min || '0'),
        salePrice: parseFloat(item.sale_price_min || item.price_min || '0'),
        image: item.image || '',
        sales: parseInt(item.sold_num || '0'),
        commission: parseFloat(item.commission_rate || '0'),
        affiliateLink: item.offer_link || '',
        category: item.first_level_category_name || '',
        shopName: item.shop_name || '',
        rating: parseFloat(item.rating || '0'),
        url: item.product_url || '',
      }));
    } catch (e) {
      this.logger.error(`Lazada top products lỗi: ${e.message}`);
      return [];
    }
  }

  // Tạo short affiliate link từ URL gốc
  async generateAffiliateLink(originalUrl: string): Promise<string | null> {
    if (!this.isConfigured) return null;

    const apiPath = '/affiliate/link/generate';
    const params = this.buildParams(apiPath, {
      urls: JSON.stringify([{ url: originalUrl }]),
    });

    try {
      const res = await this.http.post(apiPath, null, { params });
      const links = res.data?.data?.links || [];
      return links[0]?.affiliate_link || null;
    } catch (e) {
      this.logger.error(`Lazada gen link lỗi: ${e.message}`);
      return null;
    }
  }

  // Lấy OAuth Access Token (chạy một lần để lấy token)
  static async getAccessToken(appKey: string, appSecret: string, code: string): Promise<any> {
    const res = await axios.post('https://auth.lazada.vn/rest/auth/token/create', null, {
      params: {
        app_key: appKey,
        code,
        sign_method: 'sha256',
        timestamp: Date.now().toString(),
      },
    });
    return res.data;
  }
}
