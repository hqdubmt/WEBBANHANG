import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface AtCampaign {
  id: string | number;
  name: string;
  logo?: string;
  url?: string;
  commission_type?: string;
  commission_value?: number;
  status?: string;
  category?: string;
}

export interface AtPublisherInfo {
  id: string | number;
  name: string;
  email: string;
  publisher_id?: string;
  status?: string;
  balance?: number;
}

export interface AtLinkResult {
  trackingUrl: string;
  originalUrl: string;
  campaignId?: string | number;
  method: 'api' | 'deeplink';
}

@Injectable()
export class AccessTradeService {
  private readonly logger = new Logger(AccessTradeService.name);
  private readonly baseUrl = 'https://api.accesstrade.vn/v1';
  private client: AxiosInstance | null = null;

  private getClient(): AxiosInstance | null {
    const apiKey = process.env.ACCESSTRADE_API_KEY;
    if (!apiKey) return null;
    if (!this.client) {
      this.client = axios.create({
        baseURL: this.baseUrl,
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 10000,
      });
    }
    return this.client;
  }

  get hasApiKey(): boolean {
    return !!process.env.ACCESSTRADE_API_KEY;
  }

  get isConfigured(): boolean {
    return this.hasApiKey || !!(process.env.ACCESSTRADE_PID && process.env.ACCESSTRADE_TIKI_AID);
  }

  get tikiCommission(): number {
    return Number(process.env.ACCESSTRADE_TIKI_COMMISSION || '8');
  }

  // ─── Publisher Info ───────────────────────────────────────────────────────

  async getPublisherInfo(): Promise<AtPublisherInfo | null> {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data } = await client.get('/me');
      return data;
    } catch (e) {
      this.logger.error(`AT /me error: ${e.response?.data?.message || e.message}`);
      return null;
    }
  }

  // ─── Campaigns ───────────────────────────────────────────────────────────

  async getCampaigns(): Promise<AtCampaign[]> {
    const client = this.getClient();
    if (!client) return [];
    try {
      const { data } = await client.get('/campaigns');
      // AT returns { data: [...] } or just array
      return Array.isArray(data) ? data : (data?.data || data?.campaigns || data?.results || []);
    } catch (e) {
      this.logger.error(`AT /campaigns error: ${e.response?.data?.message || e.message}`);
      return [];
    }
  }

  async findTikiCampaign(): Promise<AtCampaign | null> {
    const campaigns = await this.getCampaigns();
    return campaigns.find(c =>
      c.name?.toLowerCase().includes('tiki') ||
      c.url?.includes('tiki.vn')
    ) || null;
  }

  // ─── Link Generation ─────────────────────────────────────────────────────

  async generateTrackingLink(productUrl: string, campaignId?: string | number): Promise<AtLinkResult> {
    // Try API first if key is configured
    const client = this.getClient();
    if (client && campaignId) {
      try {
        // Try POST to campaign links endpoint
        const { data } = await client.post(`/campaigns/${campaignId}/links`, { url: productUrl });
        const trackingUrl = data?.url || data?.redirect_url || data?.short_url || data?.tracking_url || data?.link;
        if (trackingUrl) {
          return { trackingUrl, originalUrl: productUrl, campaignId, method: 'api' };
        }
      } catch (e) {
        this.logger.warn(`AT link API failed, falling back to deeplink: ${e.response?.data?.message || e.message}`);
      }
    }

    // Fallback: construct deeplink URL (no API key needed)
    return { trackingUrl: this.buildDeepLink(productUrl), originalUrl: productUrl, method: 'deeplink' };
  }

  buildDeepLink(productUrl: string): string {
    const pid = process.env.ACCESSTRADE_PID;
    const aid = process.env.ACCESSTRADE_TIKI_AID;
    if (!pid || !aid) return productUrl;
    return `https://www.accesstrade.vn/en/deeplink?url=${encodeURIComponent(productUrl)}&pid=${pid}&aid=${aid}`;
  }

  // Keep old method for backwards compat
  generateDeepLink(productUrl: string): string {
    return this.buildDeepLink(productUrl);
  }

  // ─── Reports ─────────────────────────────────────────────────────────────

  async getClickStats(fromDate?: string, toDate?: string): Promise<any> {
    const client = this.getClient();
    if (!client) return null;
    const params: Record<string, string> = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    try {
      const { data } = await client.get('/reports/clicks', { params });
      return data;
    } catch (e) {
      this.logger.error(`AT clicks report error: ${e.response?.data?.message || e.message}`);
      // Try alternative endpoint
      try {
        const { data } = await client.get('/reports', { params });
        return data;
      } catch { return null; }
    }
  }

  async getConversionStats(fromDate?: string, toDate?: string): Promise<any> {
    const client = this.getClient();
    if (!client) return null;
    const params: Record<string, string> = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    try {
      const { data } = await client.get('/reports/conversions', { params });
      return data;
    } catch (e) {
      this.logger.error(`AT conversions report error: ${e.response?.data?.message || e.message}`);
      return null;
    }
  }

  // ─── Config Info ─────────────────────────────────────────────────────────

  getConfig() {
    return {
      hasApiKey: this.hasApiKey,
      configured: this.isConfigured,
      pid: process.env.ACCESSTRADE_PID || '',
      tikiAid: process.env.ACCESSTRADE_TIKI_AID || '',
      commissionRate: this.tikiCommission,
      apiMode: this.hasApiKey ? 'API Key (full features)' : 'Deeplink URL (basic)',
    };
  }
}
