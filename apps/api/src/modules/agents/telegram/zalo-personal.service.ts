import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import axios from 'axios';

const SESSION_PATH = '/tmp/zalo_session.json';

interface ZaloSession {
  imei: string;
  userAgent: string;
  cookies: any[];
}

@Injectable()
export class ZaloPersonalService {
  private readonly logger = new Logger(ZaloPersonalService.name);
  private api: any = null;
  private loginInProgress = false;

  isLoggedIn(): boolean {
    return this.api !== null;
  }

  async restoreSession(): Promise<boolean> {
    if (!existsSync(SESSION_PATH)) return false;
    try {
      const session: ZaloSession = JSON.parse(readFileSync(SESSION_PATH, 'utf8'));
      const { Zalo } = await import('zca-js');
      const zalo = new Zalo({ logging: false });
      this.api = await zalo.login({
        imei: session.imei,
        userAgent: session.userAgent,
        cookie: session.cookies,
      });
      this.logger.log('Zalo: phục hồi session thành công');
      return true;
    } catch (err: any) {
      this.logger.warn(`Zalo: không thể phục hồi session — ${err.message}`);
      this.api = null;
      return false;
    }
  }

  async loginWithQR(telegramToken: string, chatId: string): Promise<void> {
    if (this.loginInProgress) return;
    this.loginInProgress = true;

    try {
      const { Zalo, LoginQRCallbackEventType } = await import('zca-js');
      const zalo = new Zalo({ logging: false });
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      await zalo.loginQR({ userAgent: ua, qrPath: '/tmp/zalo_qr.png' }, async (event: any) => {
        if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
          await event.actions.saveToFile('/tmp/zalo_qr.png');
          await this.sendQrToTelegram(telegramToken, chatId, '/tmp/zalo_qr.png');
        } else if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
          await this.sendMsgToTelegram(telegramToken, chatId, '⚠️ Zalo QR hết hạn, đang tạo mới...');
          event.actions.retry();
        } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
          await this.sendMsgToTelegram(telegramToken, chatId, `✅ Zalo QR đã được quét bởi: ${event.data.display_name}`);
        } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
          const session: ZaloSession = {
            imei: event.data.imei,
            userAgent: ua,
            cookies: event.data.cookie,
          };
          writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2));
        }
      });

      // After loginQR resolves, restore API instance
      const restored = await this.restoreSession();
      if (restored) {
        await this.sendMsgToTelegram(telegramToken, chatId, '🎉 Đăng nhập Zalo thành công! Có thể bắt đầu đăng bài.');
      }
    } catch (err: any) {
      this.logger.error(`Zalo login lỗi: ${err.message}`);
    } finally {
      this.loginInProgress = false;
    }
  }

  async postToGroups(products: Array<{ name: string; price: number; url: string; image?: string; category?: string }>, maxGroups = 10): Promise<number> {
    if (!this.api) {
      const ok = await this.restoreSession();
      if (!ok) return 0;
    }

    let sent = 0;
    try {
      const { ThreadType } = await import('zca-js');
      const groupsRes = await this.api.getAllGroups();
      const groupIds = Object.keys(groupsRes.gridVerMap || {}).slice(0, maxGroups);

      if (groupIds.length === 0) {
        this.logger.warn('Zalo: không có group nào');
        return 0;
      }

      this.logger.log(`Zalo: đăng vào ${groupIds.length} group`);

      for (const p of products) {
        const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
        const msg = [
          `🔥 ${p.name.slice(0, 100)}`,
          `💰 Giá: ${pf}`,
          p.category ? `🏷️ ${p.category}` : '',
          `👉 ${p.url}`,
          `\n#deal #muasam #khuyenmai`,
        ].filter(Boolean).join('\n');

        for (const groupId of groupIds) {
          try {
            await this.api.sendLink({ msg, link: p.url }, groupId, ThreadType.Group);
            sent++;
            await new Promise(r => setTimeout(r, 1500));
          } catch (e: any) {
            this.logger.debug(`Zalo group ${groupId}: ${e.message}`);
          }
        }

        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (err: any) {
      this.logger.error(`Zalo postToGroups lỗi: ${err.message}`);
      if (err.message?.includes('auth') || err.message?.includes('login')) {
        this.api = null;
      }
    }

    return sent;
  }

  async getGroupCount(): Promise<number> {
    if (!this.api) {
      const ok = await this.restoreSession();
      if (!ok) return 0;
    }
    try {
      const res = await this.api.getAllGroups();
      return Object.keys(res.gridVerMap || {}).length;
    } catch {
      return 0;
    }
  }

  logout(): void {
    this.api = null;
    try { require('fs').unlinkSync(SESSION_PATH); } catch {}
  }

  private async sendQrToTelegram(token: string, chatId: string, imagePath: string): Promise<void> {
    try {
      const FormData = (await import('form-data')).default;
      const { createReadStream } = await import('fs');
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', '📱 Quét QR này bằng app Zalo để đăng nhập\n⏱ QR hết hạn sau 3 phút');
      form.append('photo', createReadStream(imagePath), 'zalo_qr.png');
      await axios.post(`https://api.telegram.org/bot${token}/sendPhoto`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });
    } catch (e: any) {
      this.logger.warn(`Không gửi được QR Zalo: ${e.message}`);
    }
  }

  private async sendMsgToTelegram(token: string, chatId: string, text: string): Promise<void> {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId, text,
    }, { timeout: 10000 }).catch(() => {});
  }
}
