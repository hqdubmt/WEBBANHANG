import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import axios from 'axios';

const SESSION_PATH = '/tmp/fb_session.json';

@Injectable()
export class FacebookGroupsService {
  private readonly logger = new Logger(FacebookGroupsService.name);
  private sessionValid = false;

  isLoggedIn(): boolean {
    return this.sessionValid && existsSync(SESSION_PATH);
  }

  async loginWithPlaywright(telegramToken: string, chatId: string): Promise<void> {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle', timeout: 30000 });

    // Send screenshot of login page to Telegram
    await this.sendMsgToTelegram(telegramToken, chatId,
      '📋 Để đăng nhập Facebook không cần API:\n\n1. Mở Facebook trên browser\n2. Nhấn F12 → Console\n3. Chạy lệnh:\n```\ncopy(document.cookie)\n```\n4. Gửi cookie string cho tôi qua /fb-cookie <paste>\n\nHoặc export cookies từ extension "Cookie Editor"'
    );

    await browser.close();
  }

  async setCookiesFromString(cookieStr: string): Promise<boolean> {
    try {
      // Parse cookie string "name=value; name2=value2" format
      const pairs = cookieStr.split(';').map(s => s.trim()).filter(Boolean);
      const cookies = pairs.map(pair => {
        const [name, ...rest] = pair.split('=');
        return {
          name: name.trim(),
          value: rest.join('=').trim(),
          domain: '.facebook.com',
          path: '/',
        };
      }).filter(c => c.name && c.value);

      writeFileSync(SESSION_PATH, JSON.stringify({ cookies }, null, 2));
      const valid = await this.validateSession();
      if (valid) this.sessionValid = true;
      return valid;
    } catch (e: any) {
      this.logger.error(`setCookies lỗi: ${e.message}`);
      return false;
    }
  }

  private async validateSession(): Promise<boolean> {
    try {
      const { chromium } = await import('playwright');
      const session = JSON.parse(readFileSync(SESSION_PATH, 'utf8'));
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      const context = await browser.newContext();
      await context.addCookies(session.cookies.map((c: any) => ({
        ...c,
        domain: c.domain || '.facebook.com',
        path: c.path || '/',
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: 'None' as const,
      })));
      const page = await context.newPage();
      await page.goto('https://www.facebook.com/', { timeout: 20000 });
      const isLoggedIn = await page.$('[aria-label="Facebook"]') !== null ||
        (await page.title()).includes('Facebook') && !await page.$('#email');
      await browser.close();
      return isLoggedIn;
    } catch {
      return false;
    }
  }

  async postToGroups(
    products: Array<{ name: string; price: number; url: string; image?: string; category?: string }>,
    groupUrls: string[],
  ): Promise<number> {
    if (!existsSync(SESSION_PATH)) return 0;

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
      expires: -1,
      httpOnly: false,
      secure: true,
      sameSite: 'None' as const,
    })));

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
      ].filter(s => s !== undefined).join('\n');

      for (const groupUrl of groupUrls) {
        const page = await context.newPage();
        try {
          const postUrl = groupUrl.replace(/\/$/, '') + '/';
          await page.goto(postUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(2000);

          // Click on post composer
          const composerSelectors = [
            '[data-testid="group-composer"]',
            '[placeholder*="Write something"]',
            '[placeholder*="Viết gì đó"]',
            '[aria-label*="Create a post"]',
            '[aria-label*="Tạo bài viết"]',
            '.x1i10hfl[role="button"]',
          ];

          let clicked = false;
          for (const sel of composerSelectors) {
            const el = await page.$(sel);
            if (el) { await el.click(); clicked = true; break; }
          }

          if (!clicked) {
            this.logger.debug(`FB Group ${groupUrl}: không tìm thấy composer`);
            await page.close();
            continue;
          }

          await page.waitForTimeout(1500);

          // Type content
          await page.keyboard.type(postText, { delay: 20 });
          await page.waitForTimeout(1000);

          // Click Post button
          const postBtnSelectors = [
            '[aria-label="Post"]',
            '[aria-label="Đăng"]',
            'button[type="submit"]',
            '[data-testid="react-composer-post-button"]',
          ];

          let posted = false;
          for (const sel of postBtnSelectors) {
            const btn = await page.$(sel);
            if (btn) {
              await btn.click();
              posted = true;
              break;
            }
          }

          if (posted) {
            sent++;
            this.logger.log(`FB Group post OK: ${groupUrl}`);
            await page.waitForTimeout(3000);
          }
        } catch (e: any) {
          this.logger.debug(`FB Group ${groupUrl} lỗi: ${e.message}`);
          this.sessionValid = false;
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
