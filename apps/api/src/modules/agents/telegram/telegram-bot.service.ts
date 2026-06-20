import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN || '';
  private lastUpdateId = 0;

  private readonly WELCOME_TEXT = `👋 *Chào mừng bạn đến với Tạp Hoá Online!*

Chúng tôi tự động tìm và gửi deal hot từ Tiki mỗi ngày:

🔥 Deal mới mỗi 2 giờ (8h–22h)
💰 Top sản phẩm giảm giá, flash sale
🛒 Điện tử, thời trang, làm đẹp, đồ gia dụng...

📢 *Theo dõi kênh chính:* t.me/banhang1

Gõ /help để xem các lệnh.`;

  private readonly HELP_TEXT = `📋 *Các lệnh bot:*

/start — Giới thiệu và hướng dẫn
/join — Link theo dõi Telegram + Discord
/help — Hiển thị menu này

📢 Theo dõi kênh deal: t.me/banhang1`;

  async onModuleInit() {
    if (!this.token) return;
    // Xóa webhook cũ để dùng polling
    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/deleteWebhook`, {
        drop_pending_updates: true,
      });
      this.logger.log('Telegram bot polling mode: sẵn sàng');
    } catch (_) {}
  }

  // Poll updates mỗi 30 giây
  @Cron('*/30 * * * * *')
  async pollUpdates(): Promise<void> {
    if (!this.token) return;
    try {
      const res = await axios.get(`https://api.telegram.org/bot${this.token}/getUpdates`, {
        params: { offset: this.lastUpdateId + 1, limit: 50, timeout: 5, allowed_updates: ['message'] },
        timeout: 10000,
      });
      const updates: any[] = res.data?.result || [];
      for (const update of updates) {
        this.lastUpdateId = update.update_id;
        await this.handleUpdate(update);
      }
    } catch (_) {}
  }

  async handleUpdate(update: any): Promise<void> {
    if (!this.token) return;

    const msg = update?.message;
    if (!msg) return;

    const chatId = msg.chat?.id;
    const text: string = msg.text || '';

    // Chào mừng thành viên mới vào group
    if (msg.new_chat_members?.length) {
      for (const member of msg.new_chat_members) {
        if (member.is_bot) continue;
        const name = member.first_name || 'bạn';
        await this.send(chatId,
          `🎉 Chào mừng *${name}* đã tham gia!\n\n📢 Theo dõi kênh deal chính: t.me/banhang1\n💡 Gõ /help để xem hướng dẫn.`
        );
      }
      return;
    }

    // Xử lý lệnh
    if (text.startsWith('/start')) {
      await this.send(chatId, this.WELCOME_TEXT);
    } else if (text.startsWith('/join')) {
      const webUrl = process.env.WEB_URL || 'http://localhost:3005';
      await this.send(chatId,
        `🔗 *Theo dõi Tạp Hoá Online:*\n\n📱 Telegram: t.me/banhang1\n🌐 Xem tất cả: ${webUrl}/join`
      );
    } else if (text.startsWith('/help')) {
      await this.send(chatId, this.HELP_TEXT);
    }
  }

  private async send(chatId: number | string, text: string): Promise<void> {
    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }, { timeout: 10000 });
    } catch (e: any) {
      this.logger.debug(`Bot send lỗi [${chatId}]: ${e.response?.data?.description || e.message}`);
    }
  }

  // Đăng ký webhook với Telegram
  async registerWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const res = await axios.post(`https://api.telegram.org/bot${this.token}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: true,
      });
      this.logger.log(`Webhook đã đăng ký: ${webhookUrl} → ${res.data?.description}`);
      return res.data?.ok;
    } catch (e: any) {
      this.logger.error(`Đăng ký webhook lỗi: ${e.message}`);
      return false;
    }
  }

  async getWebhookInfo(): Promise<any> {
    const res = await axios.get(`https://api.telegram.org/bot${this.token}/getWebhookInfo`);
    return res.data?.result;
  }
}
