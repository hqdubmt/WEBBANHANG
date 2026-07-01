import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import axios from 'axios';

const SESSION_PATH = '/tmp/fb_session.json';

@Injectable()
export class FacebookGroupsService implements OnModuleInit {
  private readonly logger = new Logger(FacebookGroupsService.name);
  private sessionValid = false;
  private loginInProgress = false;

  async onModuleInit() {
    // Tự động login khi khởi động nếu có credentials
    setTimeout(() => this.ensureLoggedIn(), 10_000);
  }

  isLoggedIn(): boolean {
    return this.sessionValid;
  }

  public async ensureLoggedIn(): Promise<boolean> {
    if (this.sessionValid) return true;
    if (this.loginInProgress) return false;

    // Thử load session cũ trước
    if (existsSync(SESSION_PATH)) {
      const ok = await this.validateSession();
      if (ok) {
        this.sessionValid = true;
        this.logger.log('FB: session cũ còn hạn ✅');
        return true;
      }
    }

    // Đăng nhập bằng email/password từ env
    const email = process.env.FACEBOOK_EMAIL;
    const password = process.env.FACEBOOK_PASSWORD;
    if (!email || !password) {
      this.logger.warn('FB: chưa cấu hình FACEBOOK_EMAIL / FACEBOOK_PASSWORD trong .env');
      return false;
    }

    return this.loginWithCredentials(email, password);
  }

  async loginWithCredentials(email: string, password: string): Promise<boolean> {
    if (this.loginInProgress) return false;
    this.loginInProgress = true;
    this.logger.log('FB: đang đăng nhập bằng email/password...');

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-infobars',
          '--window-size=1280,720',
        ],
      });

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'vi-VN',
      });

      const page = await context.newPage();

      // Ẩn dấu hiệu automation
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      // Vào thẳng trang login
      await page.goto('https://www.facebook.com/login/', { waitUntil: 'networkidle', timeout: 40000 });
      await page.waitForTimeout(2000);

      // Chấp nhận cookie consent nếu có
      for (const sel of ['[data-cookiebanner="accept_button"]', 'button[title="Allow all cookies"]', '[data-testid="cookie-policy-dialog-accept-button"]', 'button:has-text("Decline optional cookies")', 'button:has-text("Từ chối")']) {
        const btn = await page.$(sel).catch(() => null);
        if (btn) { await btn.click().catch(() => {}); await page.waitForTimeout(1000); break; }
      }

      // Điền form login
      const emailEl = await page.waitForSelector('#email, input[name="email"]', { timeout: 15000 });
      await emailEl!.click();
      await emailEl!.fill(email);
      await page.waitForTimeout(800);

      const passEl = await page.waitForSelector('#pass, input[name="pass"], input[type="password"]', { timeout: 5000 });
      await passEl!.click();
      await passEl!.fill(password);
      await page.waitForTimeout(800);

      await page.keyboard.press('Enter');

      // Đợi trang chuyển
      await page.waitForURL(url => !url.href.includes('/login'), { timeout: 25000 }).catch(() => {});
      await page.waitForTimeout(4000);

      const url = page.url();
      if (url.includes('/checkpoint') || url.includes('/two_step') || url.includes('/confirm')) {
        this.logger.warn('FB: tài khoản bị checkpoint/2FA — cần xác minh thủ công hoặc dùng account khác');
        await browser.close();
        return false;
      }
      if (url.includes('/login')) {
        this.logger.warn('FB: đăng nhập thất bại — sai email/password');
        await browser.close();
        return false;
      }

      // Đợi thêm để Facebook load đủ cookies session
      await page.waitForTimeout(3000);
      const cookies = await context.cookies();

      // Kiểm tra có cookie c_user (xác nhận thực sự đã đăng nhập)
      const cUser = cookies.find(c => c.name === 'c_user');
      if (!cUser) {
        this.logger.warn('FB: không có cookie c_user — có thể bị block hoặc cần xác minh');
        await browser.close();
        return false;
      }

      writeFileSync(SESSION_PATH, JSON.stringify({ cookies }, null, 2));
      this.sessionValid = true;
      this.logger.log(`FB: đăng nhập thành công ✅ (${cookies.length} cookies, uid=${cUser.value})`);

      await browser.close();
      return true;
    } catch (e: any) {
      this.logger.error(`FB login lỗi: ${e.message}`);
      return false;
    } finally {
      this.loginInProgress = false;
    }
  }

  // Giữ cho session luôn sống — gọi từ cron mỗi 6h
  async refreshSession(): Promise<boolean> {
    this.sessionValid = false;
    return this.ensureLoggedIn();
  }

  private async validateSession(): Promise<boolean> {
    try {
      const session = JSON.parse(readFileSync(SESSION_PATH, 'utf8'));
      const cookies: any[] = session.cookies || [];
      // Kiểm tra nhanh: có cookie c_user không (không cần mở browser)
      const cUser = cookies.find((c: any) => c.name === 'c_user' && c.value);
      const xs    = cookies.find((c: any) => c.name === 'xs' && c.value);
      if (!cUser || !xs) {
        this.logger.debug('validateSession: thiếu c_user/xs — session không hợp lệ');
        return false;
      }
      // Kiểm tra cookie chưa hết hạn
      const now = Date.now() / 1000;
      if (cUser.expires > 0 && cUser.expires < now) {
        this.logger.debug('validateSession: c_user đã hết hạn');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private async getContext() {
    const { chromium } = await import('playwright');
    const session = JSON.parse(readFileSync(SESSION_PATH, 'utf8'));
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    await context.addCookies(session.cookies.map((c: any) => ({
      ...c,
      domain: c.domain || '.facebook.com',
      path: c.path || '/',
      expires: c.expires ?? -1,
      httpOnly: c.httpOnly ?? false,
      secure: c.secure ?? true,
      sameSite: (c.sameSite as any) || 'None',
    })));
    return { browser, context };
  }

  async discoverGroupUrls(keywords: string[]): Promise<string[]> {
    if (!await this.ensureLoggedIn()) {
      this.logger.warn('discoverGroups: không thể đăng nhập Facebook');
      return [];
    }

    const { browser, context } = await this.getContext();
    const discovered = new Set<string>();

    for (const kw of keywords) {
      const page = await context.newPage();
      try {
        const searchUrl = `https://www.facebook.com/search/groups/?q=${encodeURIComponent(kw)}`;
        await page.goto(searchUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        // Scroll để load thêm kết quả
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, 1200));
          await page.waitForTimeout(2000);
        }

        // Lấy tất cả href có /groups/ từ DOM
        const links: string[] = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
          return anchors.map(a => a.href).filter(h => h.includes('/groups/'));
        });

        let found = 0;
        for (const link of links) {
          const match = link.match(/facebook\.com\/groups\/([^/?&#]+)/);
          if (match && !['feed', 'discover', 'create', 'joins', 'requests'].includes(match[1])) {
            discovered.add(`https://www.facebook.com/groups/${match[1]}`);
            found++;
          }
        }
        this.logger.log(`Group discover "${kw}": +${found}`);
      } catch (e: any) {
        this.logger.debug(`Group search "${kw}" lỗi: ${e.message}`);
        // Session có thể hết hạn
        if (e.message?.includes('403') || e.message?.includes('login')) {
          this.sessionValid = false;
        }
      } finally {
        await page.close();
      }
      await new Promise(r => setTimeout(r, 2500));
    }

    await browser.close();
    const result = [...discovered];
    this.logger.log(`Group discover xong: ${result.length} groups`);
    return result;
  }

  async postToGroups(
    products: Array<{ name: string; price: number; url: string; image?: string; category?: string }>,
    groupUrls: string[],
  ): Promise<number> {
    if (!await this.ensureLoggedIn()) return 0;

    const { browser, context } = await this.getContext();
    let sent = 0;

    for (const p of products) {
      const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
      const postText = [
        `🔥 ${p.name.slice(0, 150)}`,
        ``,
        `💰 Giá: ${pf}`,
        p.category ? `🏷️ ${p.category}` : '',
        ``,
        `👉 Mua ngay: ${p.url}`,
        ``,
        `#deal #muasam #khuyenmai #sale`,
      ].filter(Boolean).join('\n');

      for (const groupUrl of groupUrls) {
        const page = await context.newPage();
        try {
          await page.goto(groupUrl.replace(/\/$/, '') + '/', { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000);

          const composerSelectors = [
            '[data-testid="group-composer"]',
            '[placeholder*="Write something"]',
            '[placeholder*="Viết gì đó"]',
            '[aria-label*="Create a post"]',
            '[aria-label*="Tạo bài viết"]',
          ];

          let clicked = false;
          for (const sel of composerSelectors) {
            const el = await page.$(sel);
            if (el) { await el.click(); clicked = true; break; }
          }
          if (!clicked) { await page.close(); continue; }

          await page.waitForTimeout(1500);
          await page.keyboard.type(postText, { delay: 20 });
          await page.waitForTimeout(1000);

          const postBtnSelectors = [
            '[aria-label="Post"]',
            '[aria-label="Đăng"]',
            'button[type="submit"]',
            '[data-testid="react-composer-post-button"]',
          ];

          for (const sel of postBtnSelectors) {
            const btn = await page.$(sel);
            if (btn) { await btn.click(); sent++; this.logger.log(`FB Group OK: ${groupUrl}`); break; }
          }

          await page.waitForTimeout(3000);
        } catch (e: any) {
          this.logger.debug(`FB Group ${groupUrl} lỗi: ${e.message}`);
          if (e.message?.includes('403') || e.message?.includes('login')) this.sessionValid = false;
        } finally {
          await page.close();
        }
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    await browser.close();
    return sent;
  }

  logout(): void {
    this.sessionValid = false;
    try { require('fs').unlinkSync(SESSION_PATH); } catch {}
  }

  private async sendMsgToTelegram(token: string, chatId: string, text: string): Promise<void> {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId, text, parse_mode: 'Markdown',
    }, { timeout: 10000 }).catch(() => {});
  }
}
