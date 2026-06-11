import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';

interface TelegramPost {
  text: string;
  parseMode: 'Markdown' | 'HTML';
  sentAt?: Date;
}

@Injectable()
export class TelegramAgentService {
  private readonly logger = new Logger(TelegramAgentService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 9,15,21 * * *')
  async runDailyDeals() {
    this.logger.log('Telegram Agent: đăng deal...');
    await this.postDailyDeals();
  }

  @Cron('0 11 * * *')
  async runNoonNotification() {
    this.logger.log('Telegram Agent: thông báo trưa...');
    await this.postFlashSaleNotification();
  }

  async postDailyDeals(count = 3): Promise<boolean> {
    const log = this.logRepo.create({ agent: AgentName.TELEGRAM, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const products = await this.productsService.getHotProducts(count);
      const posts: TelegramPost[] = [];

      for (const product of products) {
        const post = await this.generateDealPost(product);
        posts.push(post);
      }

      let sent = 0;
      for (const post of posts) {
        const ok = await this.sendMessage(post);
        if (ok) sent++;
        await new Promise((r) => setTimeout(r, 1500));
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { posts: posts.length, sent } as any,
        durationMs: Date.now() - startMs,
      });

      return sent > 0;
    } catch (e) {
      this.logger.error('Telegram Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return false;
    }
  }

  async postFlashSaleNotification(): Promise<boolean> {
    const products = await this.productsService.getHotProducts(1);
    if (!products.length) return false;

    const product = products[0];
    const text = `⚡ *FLASH SALE HÔM NAY* ⚡\n\n*${product.name}*\n💰 Giá: ${product.price?.toLocaleString('vi-VN')}đ\n🔥 Hoa hồng: ${product.commission}%\n\n👇 Mua ngay: ${product.affiliateLink || '#'}`;

    return this.sendMessage({ text, parseMode: 'Markdown' });
  }

  async sendCustomerCareMessage(telegramId: string, message: string): Promise<boolean> {
    if (!process.env.TELEGRAM_BOT_TOKEN) return false;

    try {
      await axios.post(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        { chat_id: telegramId, text: message, parse_mode: 'Markdown' },
      );
      return true;
    } catch (e) {
      this.logger.error(`Không gửi được tới ${telegramId}:`, e.message);
      return false;
    }
  }

  private async generateDealPost(product: any): Promise<TelegramPost> {
    const systemPrompt = `Bạn là content creator Telegram bán hàng Việt Nam.
Tạo tin nhắn deal hấp dẫn, dùng emoji, Markdown. 150-200 ký tự.
Trả về JSON: {"text": "..."}`;

    try {
      const result = await this.aiService.parseJson<{ text: string }>(
        `Sản phẩm: ${product.name}, giá: ${product.price?.toLocaleString('vi-VN')}đ, link: ${product.affiliateLink || '#'}`,
        systemPrompt,
      );
      return { text: result.text, parseMode: 'Markdown' };
    } catch {
      return {
        text: `🔥 *${product.name}*\n💰 Giá: ${product.price?.toLocaleString('vi-VN')}đ\n📦 Hoa hồng: ${product.commission}%\n👇 ${product.affiliateLink || '#'}`,
        parseMode: 'Markdown',
      };
    }
  }

  private async sendMessage(post: TelegramPost): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHANNEL_ID;

    if (!token || !chatId) {
      this.logger.warn('TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHANNEL_ID chưa cấu hình');
      return false;
    }

    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: post.text,
        parse_mode: post.parseMode,
      });
      return true;
    } catch (e) {
      this.logger.error('Gửi Telegram thất bại:', e.message);
      return false;
    }
  }
}
