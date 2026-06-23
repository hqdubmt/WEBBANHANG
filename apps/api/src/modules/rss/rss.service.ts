import { Injectable, Logger } from '@nestjs/common';
import { TikiService } from '../marketplace/tiki.service';
import { AccessTradeService } from '../marketplace/accesstrade.service';

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
  category?: string;
  price: number;
}

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private cache: { xml: string; at: number } | null = null;
  private readonly TTL_MS = 30 * 60 * 1000; // 30 phút

  constructor(
    private readonly tiki: TikiService,
    private readonly at: AccessTradeService,
  ) {}

  async getDealsXml(): Promise<string> {
    if (this.cache && Date.now() - this.cache.at < this.TTL_MS) {
      return this.cache.xml;
    }
    const xml = await this.buildFeed();
    this.cache = { xml, at: Date.now() };
    return xml;
  }

  private async buildFeed(): Promise<string> {
    let products: any[] = [];
    try {
      products = await this.tiki.getTrending(40);
    } catch (e) {
      this.logger.warn(`Tiki scrape lỗi: ${e.message}`);
    }

    const items: RssItem[] = products.slice(0, 40).map((p) => {
      const affiliateUrl = p.affiliateLink || `https://tiki.vn/${p.sourceId}.html`;
      const price = p.price?.toLocaleString('vi-VN') || '0';
      const originalPrice = p.original_price
        ? ` <s>${p.original_price.toLocaleString('vi-VN')}đ</s>` : '';
      const discount = p.discount_rate ? ` giảm ${p.discount_rate}%` : '';

      return {
        title: p.name,
        link: affiliateUrl,
        description: [
          `<![CDATA[`,
          p.image ? `<img src="${p.image}" alt="${this.esc(p.name)}" style="max-width:100%"/><br/>` : '',
          `<b>${this.esc(p.name)}</b><br/>`,
          `💰 Giá: <b>${price}đ</b>${originalPrice}${discount}<br/>`,
          p.sales ? `🛒 Đã bán: ${p.sales.toLocaleString()}<br/>` : '',
          p.rating ? `⭐ ${p.rating}/5<br/>` : '',
          p.category ? `📦 ${p.category}<br/>` : '',
          `<br/><a href="${affiliateUrl}">👉 Mua ngay trên Tiki</a>`,
          `<br/><br/>📢 Theo dõi deal hot: <a href="https://t.me/banhang1">t.me/banhang1</a>`,
          `]]>`,
        ].join(''),
        pubDate: new Date().toUTCString(),
        image: p.image,
        category: p.category || 'Sản phẩm hot',
        price: p.price || 0,
      };
    });

    const _webBase = (process.env.WEB_URL || 'http://localhost').replace(/\/$/, '');
    const _webPort = process.env.WEB_PORT || '3005';
    const siteUrl = `${_webBase}:${_webPort}`;
    const now = new Date().toUTCString();

    const itemsXml = items.map((item) => `
    <item>
      <title>${this.esc(item.title)}</title>
      <link>${item.link}</link>
      <description>${item.description}</description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="true">${item.link}</guid>
      <category>${this.esc(item.category || '')}</category>
      ${item.image ? `<enclosure url="${item.image}" type="image/jpeg" length="0"/>` : ''}
      <media:content url="${item.image || ''}" medium="image"/>
    </item>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tạp Hoá Online — Deal Tiki Hot Mỗi Ngày</title>
    <link>${siteUrl}</link>
    <description>Top sản phẩm bán chạy Tiki, giá tốt nhất, cập nhật tự động mỗi ngày. Affiliate link AccessTrade.</description>
    <language>vi</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/api/rss/deals" rel="self" type="application/rss+xml"/>
    <image>
      <url>${siteUrl}/favicon.ico</url>
      <title>Tạp Hoá Online</title>
      <link>${siteUrl}</link>
    </image>
    ${itemsXml}
  </channel>
</rss>`;
  }

  private esc(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
