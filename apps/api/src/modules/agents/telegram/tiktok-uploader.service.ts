import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';

const SESSION_FILE = path.join(os.tmpdir(), 'tiktok_session.json');
const VIDEO_DIR = path.join(os.tmpdir(), 'tiktok_videos');

@Injectable()
export class TikTokUploaderService {
  private readonly logger = new Logger(TikTokUploaderService.name);
  private loginBrowser: any = null;

  hasSession(): boolean {
    return fs.existsSync(SESSION_FILE);
  }

  private async launchBrowser(storageState?: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { chromium } = require('playwright');
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const contextOpts: any = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 },
      locale: 'vi-VN',
      timezoneId: 'Asia/Ho_Chi_Minh',
    };
    if (storageState && fs.existsSync(storageState)) {
      contextOpts.storageState = storageState;
    }
    const context = await browser.newContext(contextOpts);
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    return { browser, context };
  }

  // Bước 1: Lấy QR code ảnh để gửi Telegram — user quét bằng điện thoại
  async getLoginQRImage(): Promise<Buffer | null> {
    if (this.loginBrowser) {
      try { await this.loginBrowser.close(); } catch { /* ignore */ }
      this.loginBrowser = null;
    }

    const { browser, context } = await this.launchBrowser();
    this.loginBrowser = browser;

    try {
      const page = await context.newPage();
      await page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Click "Use QR code" tab nếu có
      for (const sel of ['[data-e2e="qrcode-tab"]', 'text=Use QR code', 'text=Mã QR']) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 2000 })) { await el.click(); break; }
        } catch { /* next */ }
      }
      await page.waitForTimeout(2000);

      // Chụp ảnh vùng QR
      let qrBuf: Buffer | null = null;
      for (const sel of ['[data-e2e="qrcode"]', 'canvas', 'img[src*="qr"]', '.qrcode-container']) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 2000 })) {
            qrBuf = await el.screenshot() as Buffer;
            break;
          }
        } catch { /* next */ }
      }

      if (!qrBuf) {
        // Fallback: chụp toàn trang
        qrBuf = await page.screenshot({ clip: { x: 300, y: 100, width: 680, height: 600 } }) as Buffer;
      }

      // Chờ login xong ở background (tối đa 3 phút)
      this.waitForQRLogin(browser, context, page).catch(() => { /* ignore */ });

      return qrBuf;
    } catch (e: any) {
      this.logger.error(`Lỗi lấy QR: ${e.message}`);
      await browser.close();
      this.loginBrowser = null;
      return null;
    }
  }

  private async waitForQRLogin(browser: any, context: any, page: any): Promise<void> {
    try {
      await page.waitForURL(/tiktok\.com\/(foryou|home|explore|\?|vi\/)/, { timeout: 180000 });
      await context.storageState({ path: SESSION_FILE });
      this.logger.log('TikTok: Đăng nhập QR thành công ✅ session đã lưu');
    } catch {
      this.logger.warn('TikTok: Hết 3 phút chờ QR — thử lại');
    } finally {
      try { await browser.close(); } catch { /* ignore */ }
      this.loginBrowser = null;
    }
  }

  // Upload một video lên TikTok
  async uploadVideo(videoPath: string, caption: string): Promise<boolean> {
    if (!fs.existsSync(SESSION_FILE)) {
      this.logger.warn('TikTok: Chưa đăng nhập — gọi getLoginQRImage() trước');
      return false;
    }
    if (!fs.existsSync(videoPath)) {
      this.logger.warn(`TikTok: Không tìm thấy video: ${videoPath}`);
      return false;
    }

    const { browser, context } = await this.launchBrowser(SESSION_FILE);
    try {
      const page = await context.newPage();

      // Thử trang upload creator
      await page.goto('https://www.tiktok.com/creator#/upload', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Kiểm tra còn login không
      if (page.url().includes('login')) {
        this.logger.warn('TikTok: Session hết hạn');
        fs.unlinkSync(SESSION_FILE);
        await browser.close();
        return false;
      }

      // Tìm input file và upload
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.waitFor({ timeout: 10000 });
      await fileInput.setInputFiles(videoPath);
      this.logger.log('TikTok: Đã chọn file, đang xử lý...');

      // Chờ video xử lý
      await page.waitForTimeout(10000);

      // Xoá caption mặc định và nhập mới
      for (const sel of ['[contenteditable="true"]', '.public-DraftEditor-content', '[data-e2e="caption-input"]']) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 3000 })) {
            await el.click();
            await page.keyboard.press('Control+A');
            await page.keyboard.type(caption, { delay: 30 });
            break;
          }
        } catch { /* next */ }
      }

      await page.waitForTimeout(1000);

      // Click nút Post/Đăng
      let posted = false;
      for (const sel of ['button:has-text("Post")', 'button:has-text("Đăng")', '[data-e2e="post-btn"]']) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 3000 })) {
            await btn.click();
            posted = true;
            break;
          }
        } catch { /* next */ }
      }

      if (!posted) {
        this.logger.warn('TikTok: Không tìm thấy nút Post — chụp màn hình debug');
        await page.screenshot({ path: '/tmp/tiktok_debug.png' });
        await browser.close();
        return false;
      }

      await page.waitForTimeout(5000);
      await context.storageState({ path: SESSION_FILE }); // Refresh session
      this.logger.log(`TikTok: Upload OK ✅ ${path.basename(videoPath)}`);
      await browser.close();
      return true;
    } catch (e: any) {
      this.logger.error(`TikTok upload lỗi: ${e.message}`);
      try { await browser.close(); } catch { /* ignore */ }
      return false;
    }
  }

  // Upload các video mới nhất từ /tmp/tiktok_videos/
  async uploadLatestVideos(count = 2): Promise<{ uploaded: number; failed: number }> {
    if (!fs.existsSync(VIDEO_DIR)) return { uploaded: 0, failed: 0 };

    const files = fs.readdirSync(VIDEO_DIR)
      .filter(f => f.endsWith('.mp4'))
      .map(f => ({ name: f, time: fs.statSync(path.join(VIDEO_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time)
      .slice(0, count)
      .map(f => path.join(VIDEO_DIR, f.name));

    if (files.length === 0) {
      this.logger.warn('TikTok: Không có video nào trong /tmp/tiktok_videos/');
      return { uploaded: 0, failed: 0 };
    }

    let uploaded = 0, failed = 0;
    for (const videoPath of files) {
      const caption = this.buildCaption(path.basename(videoPath));
      const ok = await this.uploadVideo(videoPath, caption);
      if (ok) uploaded++; else failed++;
      if (files.indexOf(videoPath) < files.length - 1) {
        await new Promise(r => setTimeout(r, 15000)); // 15s giữa các lần upload
      }
    }

    return { uploaded, failed };
  }

  private buildCaption(filename: string): string {
    // deal_1234567_0.mp4 → generic caption
    return `🔥 Deal hot hôm nay!\n\n💰 Giá cực rẻ — mua ngay kẻo hết!\n👉 Link trong bio\n\n#deal #muasam #tiki #shopee #khuyenmai #giare #vietnam #trending`;
  }

  // Xoá session (logout)
  clearSession(): void {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
    this.logger.log('TikTok: Đã xoá session');
  }
}
