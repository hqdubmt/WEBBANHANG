import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

export interface ShopeeProduct {
  itemId: string;
  shopId: string;
  name: string;
  price: number;        // đơn vị: VND
  priceMin: number;
  priceMax: number;
  image: string;
  sales: number;
  ratingStar: number;
  ratingCount: number;
  commission: number;   // phần trăm hoa hồng
  affiliateLink: string;
  category: string;
  shopName: string;
}

@Injectable()
export class ShopeeService {
  private readonly logger = new Logger(ShopeeService.name);
  private readonly BASE_URL = 'https://open-api.affiliate.shopee.vn';
  private readonly appId: string;
  private readonly secret: string;
  private readonly http: AxiosInstance;

  constructor() {
    this.appId = process.env.SHOPEE_APP_ID || '';
    this.secret = process.env.SHOPEE_SECRET || '';
    this.http = axios.create({ baseURL: this.BASE_URL, timeout: 15000 });
  }

  get isConfigured(): boolean {
    return !!(this.appId && this.secret);
  }

  // Tạo chữ ký HMAC-SHA256 theo chuẩn Shopee Affiliate API
  private sign(path: string, timestamp: number, body = ''): string {
    const payload = `${this.appId}${timestamp}${path}${body}`;
    return crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  private authHeader(path: string, body = ''): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const sig = this.sign(path, timestamp, body);
    return {
      Authorization: `SHA256 AppId=${this.appId}&Timestamp=${timestamp}&Signature=${sig}`,
      'Content-Type': 'application/json',
    };
  }

  // Tìm sản phẩm hot theo keyword hoặc category
  async searchProducts(keyword: string, limit = 20): Promise<ShopeeProduct[]> {
    if (!this.isConfigured) {
      this.logger.warn('Shopee: chưa cấu hình SHOPEE_APP_ID / SHOPEE_SECRET');
      return [];
    }

    const path = '/graphql';
    const query = {
      operationName: 'productOfferV2',
      variables: {
        listType: 0,
        sortType: 2,       // 2 = bán chạy nhất
        keyword,
        limit,
        page: 1,
      },
      query: `
        query productOfferV2($keyword: String, $sortType: Int, $listType: Int, $limit: Int, $page: Int) {
          productOfferV2(keyword: $keyword, sortType: $sortType, listType: $listType, limit: $limit, page: $page) {
            nodes {
              itemId
              shopId
              productName
              priceMin
              priceMax
              commissionRate
              sales
              imageUrl
              offerLink
              shopName
              ratingStar
            }
            pageInfo { hasNextPage }
          }
        }
      `,
    };

    const body = JSON.stringify(query);
    try {
      const res = await this.http.post(path, body, { headers: this.authHeader(path, body) });
      const nodes = res.data?.data?.productOfferV2?.nodes || [];
      return nodes.map((n: any) => ({
        itemId: n.itemId,
        shopId: n.shopId,
        name: n.productName,
        price: n.priceMin,
        priceMin: n.priceMin,
        priceMax: n.priceMax,
        image: n.imageUrl,
        sales: n.sales || 0,
        ratingStar: n.ratingStar || 0,
        ratingCount: 0,
        commission: parseFloat(n.commissionRate || '0') * 100,
        affiliateLink: n.offerLink,
        category: keyword,
        shopName: n.shopName,
      }));
    } catch (e) {
      this.logger.error(`Shopee search "${keyword}" lỗi: ${e.message}`);
      return [];
    }
  }

  // Lấy sản phẩm hot trending (listType = 1)
  async getTrendingProducts(limit = 50): Promise<ShopeeProduct[]> {
    if (!this.isConfigured) return [];

    const path = '/graphql';
    const query = {
      operationName: 'productOfferV2',
      variables: { listType: 1, sortType: 2, limit, page: 1 },
      query: `
        query productOfferV2($listType: Int, $sortType: Int, $limit: Int, $page: Int) {
          productOfferV2(listType: $listType, sortType: $sortType, limit: $limit, page: $page) {
            nodes {
              itemId shopId productName priceMin priceMax commissionRate
              sales imageUrl offerLink shopName ratingStar categoryIds
            }
          }
        }
      `,
    };

    const body = JSON.stringify(query);
    try {
      const res = await this.http.post(path, body, { headers: this.authHeader(path, body) });
      const nodes = res.data?.data?.productOfferV2?.nodes || [];
      return nodes.map((n: any) => ({
        itemId: n.itemId,
        shopId: n.shopId,
        name: n.productName,
        price: n.priceMin,
        priceMin: n.priceMin,
        priceMax: n.priceMax,
        image: n.imageUrl,
        sales: n.sales || 0,
        ratingStar: n.ratingStar || 0,
        ratingCount: 0,
        commission: parseFloat(n.commissionRate || '0') * 100,
        affiliateLink: n.offerLink,
        category: '',
        shopName: n.shopName,
      }));
    } catch (e) {
      this.logger.error(`Shopee trending lỗi: ${e.message}`);
      return [];
    }
  }

  // Tạo link affiliate từ link sản phẩm gốc
  async generateAffiliateLink(originalUrl: string): Promise<string | null> {
    if (!this.isConfigured) return null;

    const path = '/graphql';
    const query = {
      operationName: 'generateShortLink',
      variables: { originUrl: originalUrl, subId: 'ai_commerce' },
      query: `
        mutation generateShortLink($originUrl: String!, $subId: String) {
          generateShortLink(originUrl: $originUrl, subId: $subId) {
            shortLink
          }
        }
      `,
    };

    const body = JSON.stringify(query);
    try {
      const res = await this.http.post(path, body, { headers: this.authHeader(path, body) });
      return res.data?.data?.generateShortLink?.shortLink || null;
    } catch (e) {
      this.logger.error(`Shopee gen link lỗi: ${e.message}`);
      return null;
    }
  }
}
