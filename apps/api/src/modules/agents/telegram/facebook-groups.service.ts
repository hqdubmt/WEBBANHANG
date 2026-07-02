import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import axios from 'axios';

export interface FbGroupRecord {
  url: string;
  slug: string;
  name?: string;
  status: 'member' | 'pending' | 'discovered';
  joinedAt?: string;
  lastPostedAt?: string;
  memberCount?: number;
}

const TARGET_GROUPS_FILE = '/app/fb_data/fb_target_groups.json';
const GROUPS_META_FILE = '/app/fb_data/fb_groups_meta.json';

const SESSION_PATH = '/app/fb_data/fb_session.json';

@Injectable()
export class FacebookGroupsService implements OnModuleInit {
  private readonly logger = new Logger(FacebookGroupsService.name);
  private sessionValid = false;
  private loginInProgress = false;
  // Persistent browser — tránh tạo mới mỗi lần gây fingerprint mismatch
  private persistentBrowser: any = null;
  private persistentContext: any = null;

  async onModuleInit() {
    // Tự động login khi khởi động nếu có credentials
    setTimeout(() => this.ensureLoggedIn(), 10_000);
  }

  isLoggedIn(): boolean {
    return this.sessionValid;
  }

  public async ensureLoggedIn(): Promise<boolean> {
    if (this.sessionValid) return true;

    // Ưu tiên session file — kiểm tra ngay không cần đợi loginInProgress
    if (existsSync(SESSION_PATH)) {
      const ok = await this.validateSession();
      if (ok) {
        this.sessionValid = true;
        this.logger.log('FB: session cũ còn hạn ✅');
        return true;
      }
    }

    if (this.loginInProgress) return false;

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

  private readonly normSameSite = (v: any): 'Strict' | 'Lax' | 'None' => {
    if (!v) return 'None';
    const s = String(v).toLowerCase();
    if (s === 'strict') return 'Strict';
    if (s === 'lax') return 'Lax';
    return 'None';
  };

  // Profile dir cố định — giữ fingerprint/cookies nhất quán qua restart
  private readonly PROFILE_DIR = '/app/fb_data/browser_profile';

  // Tạo context 1 lần và tái sử dụng
  private async getContext() {
    if (this.persistentContext) {
      try {
        // Kiểm tra context còn sống
        await this.persistentContext.pages();
        return { browser: this.persistentBrowser, context: this.persistentContext };
      } catch {
        this.persistentContext = null;
        this.persistentBrowser = null;
      }
    }

    // Dùng playwright-extra + stealth plugin để bypass FB bot detection
    const { chromium: chromiumExtra } = await import('playwright-extra');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stealthPlugin = require('puppeteer-extra-plugin-stealth');
    chromiumExtra.use(stealthPlugin());
    mkdirSync(this.PROFILE_DIR, { recursive: true });

    const context = await chromiumExtra.launchPersistentContext(this.PROFILE_DIR, {
      headless: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'vi-VN',
      timezoneId: 'Asia/Ho_Chi_Minh',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-dev-shm-usage',
      ],
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      // @ts-ignore
      window.chrome = { runtime: {} };
    });

    this.persistentContext = context;
    this.persistentBrowser = null; // PersistentContext không có browser object riêng
    this.logger.log('FB: tạo persistent browser context mới ✅');

    // Inject TẤT CẢ cookies (bao gồm datr) — datr cần thiết để xs hoạt động
    if (existsSync(SESSION_PATH)) {
      try {
        const session = JSON.parse(readFileSync(SESSION_PATH, 'utf8'));
        await context.addCookies(session.cookies.map((c: any) => ({
          name: c.name,
          value: c.value,
          domain: c.domain || '.facebook.com',
          path: c.path || '/',
          expires: c.expirationDate ?? c.expires ?? -1,
          httpOnly: c.httpOnly ?? false,
          secure: c.secure ?? true,
          sameSite: this.normSameSite(c.sameSite),
        })));
        this.logger.log(`FB: đã inject ${session.cookies.length} cookies`);
      } catch {}
    }

    // Warm-up: visit FB và kiểm tra THỰC SỰ có đăng nhập không
    // (check element user-specific, không phải URL — FB homepage không redirect khi chưa đăng nhập)
    try {
      const warmPage = await context.newPage();
      await warmPage.goto('https://www.facebook.com/', { timeout: 25000, waitUntil: 'domcontentloaded' });
      await warmPage.waitForTimeout(4000);
      // Kiểm tra xem có nút Đăng nhập hay không → nếu có = chưa đăng nhập
      await warmPage.screenshot({ path: '/app/fb_data/warmup_debug.png' }).catch(() => {});
      const warmUrl = warmPage.url();
      this.logger.debug(`warm-up URL: ${warmUrl.slice(0, 80)}`);

      // Xử lý flow đăng nhập qua profile selector
      try {
        // Bước 1: Click "Continue" nếu FB hiện màn chọn profile
        const continueSelectors = [
          '[role="button"]:has-text("Continue")',
          'button:has-text("Continue")',
        ];
        for (const sel of continueSelectors) {
          const el = warmPage.locator(sel).first();
          if (await el.count() > 0 && await el.isVisible()) {
            this.logger.log('FB: phát hiện màn "Continue as" — đang click...');
            await el.click({ timeout: 5000 });
            await warmPage.waitForTimeout(3000);
            break;
          }
        }

        // Bước 2: Nếu có form nhập password (sau khi click Continue hoặc ngay từ đầu)
        const pwInput = warmPage.locator('input[type="password"], input[name="pass"], #pass').first();
        if (await pwInput.count() > 0 && await pwInput.isVisible()) {
          const password = process.env.FACEBOOK_PASSWORD;
          if (password) {
            this.logger.log('FB: phát hiện form password — đang đăng nhập...');
            await pwInput.click();
            await pwInput.fill(password);
            await warmPage.waitForTimeout(500);
            // Click nút Log in / Đăng nhập
            const loginBtn = warmPage.locator('button[name="login"], button:has-text("Log in"), [role="button"]:has-text("Log in")').first();
            if (await loginBtn.count() > 0) {
              await loginBtn.click({ timeout: 5000 });
            } else {
              await warmPage.keyboard.press('Enter');
            }
            // Đợi redirect sau login
            await warmPage.waitForTimeout(8000);
            await warmPage.screenshot({ path: '/app/fb_data/warmup_after_continue.png' }).catch(() => {});
            const afterUrl = warmPage.url();
            if (afterUrl.includes('checkpoint') || afterUrl.includes('two_step')) {
              this.logger.warn('FB: login bị 2FA/checkpoint — cần xác minh thủ công');
            } else {
              this.logger.log(`FB: sau login URL = ${afterUrl.slice(0, 60)}`);
            }
          } else {
            this.logger.warn('FB: cần password nhưng FACEBOOK_PASSWORD chưa được set');
          }
        } else {
          this.logger.debug('warm-up: không có form password');
        }
      } catch (e: any) {
        this.logger.debug(`warm-up login lỗi: ${e.message?.slice(0, 50)}`);
      }

      // Kiểm tra THỰC SỰ đã đăng nhập chưa: tìm thanh nav có avatar/tên user
      // (guest page và Continue page đều KHÔNG có news feed nav)
      const isLoggedIn = await warmPage.evaluate(() => {
        // Tìm nav có profile picture, hoặc link đến profile, hoặc icon messenger
        const selectors = [
          '[aria-label="Home"]',  // nav home icon (only logged-in)
          '[aria-label="Trang chủ"]',
          'a[href="/"][aria-label]',
          '[data-testid="blue_bar_profile_link"]',
        ];
        for (const sel of selectors) {
          if (document.querySelector(sel)) return true;
        }
        // Kiểm tra xem có chứa menu thanh nav của người dùng đăng nhập không
        const navEl = document.querySelector('[role="navigation"]');
        if (navEl && navEl.querySelectorAll('a').length > 5) return true;
        return false;
      }).catch(() => false);

      if (warmUrl.includes('login') || warmUrl.includes('checkpoint')) {
        this.logger.warn('FB: warm-up failed — redirect về login');
      } else if (isLoggedIn) {
        this.logger.log('FB: warm-up OK ✅ — đã đăng nhập thành công');
        await warmPage.evaluate(() => window.scrollBy(0, 300));
        await warmPage.waitForTimeout(2000);
      } else {
        this.logger.warn('FB: warm-up failed — chưa đăng nhập (không tìm thấy nav element)');
      }
      await warmPage.close();
    } catch (e: any) {
      this.logger.debug(`warm-up lỗi: ${e.message?.slice(0, 60)}`);
    }

    return { browser: null, context };
  }

  // Reset browser khi session hết hạn
  async resetBrowser() {
    try { await this.persistentContext?.close(); } catch {}
    this.persistentBrowser = null;
    this.persistentContext = null;
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

    // Không đóng browser — giữ persistent context
    const result = [...discovered];
    this.logger.log(`Group discover xong: ${result.length} groups`);
    return result;
  }

  // Kiểm tra thành viên — tự join nếu chưa. Trả về true nếu có thể đăng bài.
  private async ensureMember(page: any, groupSlug: string): Promise<boolean> {
    // Kiểm tra có composer / marketplace trigger không (đã là thành viên)
    const memberIndicators = [
      '[data-testid="group-composer"]',
      '[placeholder*="Write something"]',
      '[placeholder*="Viết gì đó"]',
      '[aria-label*="Create a post"]',
      '[aria-label*="Tạo bài viết"]',
      '[aria-label*="Write something"]',
      '[aria-label*="What\'s on your mind"]',
      '[aria-label*="Bạn đang nghĩ gì"]',
      'div[role="button"]:has-text("Viết gì đó")',
      'div[role="button"]:has-text("Write something")',
      'div[role="button"]:has-text("Bán gì đó")',  // marketplace group
      'div[contenteditable="true"][data-lexical-editor]',
      'div[contenteditable="false"][data-placeholder*="Write"]',
      'div[contenteditable="false"][data-placeholder*="Viết"]',
    ];
    for (const sel of memberIndicators) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) {
          this.logger.debug(`${groupSlug}: đã là thành viên ✅`);
          return true;
        }
      } catch {}
    }

    // Tìm nút Join / Tham gia
    const joinSelectors = [
      'div[aria-label="Join group"]',
      'div[aria-label="Tham gia nhóm"]',
      'div[aria-label="Join Group"]',
      '[data-testid="fb-ufi-join-group"]',
    ];

    let joinBtn: any = null;
    for (const sel of joinSelectors) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) { joinBtn = el; break; }
      } catch {}
    }

    // Fallback: tìm button có text "Join group" hoặc "Tham gia"
    if (!joinBtn) {
      try {
        const btn = page.getByRole('button', { name: /^(Join group|Tham gia nhóm|Join Group|Tham gia)$/i });
        if (await btn.count() > 0) joinBtn = btn.first();
      } catch {}
    }

    if (!joinBtn) {
      // Log page title để debug
      const title = await page.title().catch(() => '?');
      this.logger.debug(`${groupSlug}: không tìm thấy nút Join (chờ duyệt hoặc đã là TV) — title: ${title}`);
      return false;
    }

    // Click Join
    try {
      await joinBtn.evaluate((e: any) => e.click());
      this.logger.log(`FB Group ${groupSlug}: đã gửi yêu cầu tham gia ⏳`);
      await page.waitForTimeout(4000);

      // Với group công khai, join xong ngay → kiểm tra lại có composer không
      // Với group kín → cần admin duyệt → bỏ qua lần này
      for (const sel of [
        '[data-testid="group-composer"]',
        '[placeholder*="Write something"]',
        '[placeholder*="Viết gì đó"]',
        '[aria-label*="Create a post"]',
        '[aria-label*="Tạo bài viết"]',
      ]) {
        try {
          const el = await page.$(sel);
          if (el && await el.isVisible()) {
            this.logger.log(`FB Group ${groupSlug}: join thành công, có thể đăng ngay ✅`);
            return true;
          }
        } catch {}
      }

      this.logger.log(`${groupSlug}: đã gửi yêu cầu join, chờ admin duyệt — bỏ qua lần này`);
      return false;
    } catch (e: any) {
      this.logger.debug(`${groupSlug}: lỗi khi join: ${e.message?.slice(0, 80)}`);
      return false;
    }
  }

  async postToGroups(
    products: Array<{ name: string; price: number; url: string; image?: string; category?: string }>,
    groupUrls: string[],
  ): Promise<number> {
    if (!await this.ensureLoggedIn()) return 0;

    const { browser, context } = await this.getContext();
    let sent = 0;
    let sessionExpired = false;

    const pageName = process.env.FACEBOOK_PAGE_NAME || 'Tổng hợp ưu đãi - deal hot mỗi ngày';
    const pageUrl  = process.env.FACEBOOK_PAGE_URL  || `https://www.facebook.com/${process.env.FACEBOOK_PAGE_ID || ''}`;

    for (const p of products) {
      if (sessionExpired) break;
      const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
      this.logger.log(`FB post link: ${p.url.slice(0, 80)}`);
      const postText = [
        `🔥 ${p.name.slice(0, 150)}`,
        ``,
        `💰 Giá: ${pf}`,
        p.category ? `🏷️ ${p.category}` : '',
        ``,
        `👉 Mua ngay: ${p.url}`,
        ``,
        `━━━━━━━━━━━━━━━━━━`,
        `📌 Theo dõi trang để nhận deal hot mỗi ngày:`,
        `👍 ${pageName}`,
        `🔗 ${pageUrl}`,
        ``,
        `#deal #muasam #khuyenmai #sale`,
      ].filter(Boolean).join('\n');

      for (const groupUrl of groupUrls) {
        const page = await context.newPage();
        try {
          const groupMatch = groupUrl.match(/facebook\.com\/groups\/([^/?#]+)/);
          if (!groupMatch) { await page.close(); continue; }
          const groupSlug = groupMatch[1];

          await page.goto(`https://www.facebook.com/groups/${groupSlug}/`, { timeout: 35000, waitUntil: 'domcontentloaded' });
          // Đợi page render xong
          await page.waitForTimeout(5000);

          // Đóng popup login / "Xem thêm" nếu có
          for (const closeX of [
            '[aria-label="Close"]', '[aria-label="Đóng"]', 'div[role="dialog"] [aria-label="Close"]',
            'div[role="dialog"] > div > [role="button"]',
          ]) {
            try {
              const el = await page.$(closeX);
              if (el && await el.isVisible()) {
                await el.evaluate((e: any) => e.click());
                await page.waitForTimeout(1500);
                break;
              }
            } catch {}
          }
          // Đóng bằng X button trên modal
          try {
            const closeBtn = page.getByRole('button', { name: /close|đóng/i }).first();
            if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
              await closeBtn.evaluate((e: any) => e.click());
              await page.waitForTimeout(1500);
            }
          } catch {}
          // Nhấn Escape để đóng modal nếu còn
          try {
            const dialog = await page.$('[role="dialog"]');
            if (dialog) { await page.keyboard.press('Escape'); await page.waitForTimeout(1000); }
          } catch {}

          // Đợi thêm cho marketplace groups có "Bán gì đó" hoặc composer thường
          await page.waitForSelector(
            'div[role="button"]:has-text("Bán gì đó"), div[role="button"]:has-text("Viết gì đó"), [aria-label*="Create a post"], [aria-label*="Tạo bài viết"]',
            { timeout: 8000 }
          ).catch(() => {});

          // Log URL và title sau khi navigate để detect session expired
          const pageTitle = await page.title().catch(() => '?');
          const pageUrl = page.url();
          this.logger.debug(`${groupSlug}: sau goto → title="${pageTitle}", url=${pageUrl.slice(0, 80)}`);
          try { await page.screenshot({ path: `/app/fb_data/${groupSlug}_debug.png`, fullPage: false }); } catch {}

          // Nếu bị redirect về login/homepage → thử re-inject cookies trước
          if (!pageUrl.includes('/groups/') && (pageUrl.includes('login') || pageUrl.includes('checkpoint') || pageTitle === 'Facebook')) {
            this.logger.warn(`${groupSlug}: session hết hạn (${pageUrl.slice(0, 60)}) — thử re-inject cookies...`);
            this.sessionValid = false;
            await page.close();

            // Bước 1: re-inject cookies từ session file vào context hiện tại (không tạo browser mới)
            let recovered = false;
            if (existsSync(SESSION_PATH) && this.persistentContext) {
              try {
                const sess = JSON.parse(readFileSync(SESSION_PATH, 'utf8'));
                await this.persistentContext.addCookies(sess.cookies.map((c: any) => ({
                  name: c.name, value: c.value,
                  domain: c.domain || '.facebook.com', path: c.path || '/',
                  expires: c.expirationDate ?? c.expires ?? -1,
                  httpOnly: c.httpOnly ?? false, secure: c.secure ?? true,
                  sameSite: this.normSameSite(c.sameSite),
                })));
                // Kiểm tra xem cookies mới có hợp lệ không
                const testPage = await this.persistentContext.newPage();
                await testPage.goto('https://www.facebook.com/', { timeout: 20000, waitUntil: 'domcontentloaded' });
                await testPage.waitForTimeout(3000);
                const testUrl = testPage.url();
                if (!testUrl.includes('login') && !testUrl.includes('checkpoint')) {
                  this.sessionValid = true;
                  recovered = true;
                  this.logger.log('Re-inject cookies thành công ✅ — tiếp tục posting');
                }
                await testPage.close();
              } catch (e: any) {
                this.logger.debug(`Re-inject lỗi: ${e.message?.slice(0, 60)}`);
              }
            }

            if (!recovered) {
              this.logger.warn('Re-inject thất bại — session file có thể đã hết hạn, cần cung cấp cookies mới');
              sessionExpired = true;
            }
            break; // Dừng inner loop; outer loop sẽ break nếu sessionExpired
          }

          // Kiểm tra & tự join nếu chưa là thành viên
          const joined = await this.ensureMember(page, groupSlug);
          if (!joined) {
            // Nếu group bị kick (status 'member' nhưng thực tế pending) → update status
            this.updateGroupStatus(groupSlug, 'pending');
            await page.close();
            continue;
          }

          // Với marketplace group: navigate sang tab "Đăng chủ ý" để dùng regular post composer
          let switchedToDiscussion = false;
          try {
            const candidates = ['Đăng chủ ý', 'Thảo luận', 'Discussion'];
            const discussionHref = await page.evaluate((cands: string[]) => {
              const els = Array.from(document.querySelectorAll('a[href], [role="link"]')) as HTMLAnchorElement[];
              for (const text of cands) {
                const el = els.find(e => {
                  const t = (e.textContent || '').trim();
                  const rect = e.getBoundingClientRect();
                  return t.includes(text) && rect.width > 0;
                });
                if (el) return el.getAttribute('href') || el.href;
              }
              return null;
            }, candidates);
            if (discussionHref) {
              const fullHref = discussionHref.startsWith('http') ? discussionHref : `https://www.facebook.com${discussionHref}`;
              await page.goto(fullHref, { waitUntil: 'domcontentloaded', timeout: 20000 });
              await page.waitForTimeout(4000);
              switchedToDiscussion = true;
              this.logger.debug(`${groupSlug}: đã chuyển sang discussion tab ✅`);
            }
          } catch {}

          // Scroll nhẹ để lazy-load composer
          await page.evaluate(() => window.scrollTo(0, 200));
          await page.waitForTimeout(switchedToDiscussion ? 1000 : 3000);

          // Tìm ô soạn bài và click mở modal — Facebook 2024+ selectors (kể cả marketplace)
          const composerTriggers = [
            '[data-testid="group-composer"]',
            '[placeholder*="Write something"]',
            '[placeholder*="Viết gì đó"]',
            '[placeholder*="Bán gì đó"]',
            '[aria-label*="Create a post"]',
            '[aria-label*="Tạo bài viết"]',
            '[aria-label*="Write something"]',
            '[aria-label*="What\'s on your mind"]',
            '[aria-label*="Bạn đang nghĩ gì"]',
            'div[role="button"]:has-text("Viết gì đó")',
            'div[role="button"]:has-text("Write something")',
            'div[role="button"]:has-text("What\'s on your mind")',
            'div[role="button"]:has-text("Bán gì đó")',
            'div[role="button"][tabindex="0"]:has-text("Viết")',
            'div[role="button"][tabindex="0"]:has-text("Bán")',
            'div[contenteditable="false"][data-placeholder]',
          ];

          let triggerClicked = false;
          for (const sel of composerTriggers) {
            try {
              const loc = page.locator(sel).first();
              if (await loc.count() > 0 && await loc.isVisible()) {
                this.logger.debug(`${groupSlug}: trigger found: ${sel}`);
                await loc.click({ timeout: 8000 });
                triggerClicked = true;
                break;
              }
            } catch {}
          }

          // Fallback: getByPlaceholder với Playwright click
          if (!triggerClicked) {
            try {
              for (const ph of ['Viết gì đó', 'Write something', "What's on your mind", 'Bạn đang nghĩ gì', 'Bán gì đó']) {
                const el = page.getByPlaceholder(ph, { exact: false });
                if (await el.count() > 0 && await el.first().isVisible()) {
                  await el.first().click({ timeout: 8000 });
                  triggerClicked = true;
                  break;
                }
              }
            } catch {}
          }

          // Fallback: tìm button trong vùng feed chính (không phải nav)
          if (!triggerClicked) {
            try {
              const feedBtns = await page.$$eval(
                '[data-pagelet="GroupFeed"] [role="button"], [role="feed"] [role="button"], main [role="button"]',
                (els: any[]) => els.slice(0, 5).map((e: any) => ({
                  text: (e.textContent || '').trim().slice(0, 60),
                  ph: e.getAttribute('data-placeholder') || '',
                  label: e.getAttribute('aria-label') || '',
                }))
              );
              this.logger.debug(`${groupSlug}: feed buttons: ${JSON.stringify(feedBtns)}`);
              // Click button đầu tiên trong feed nếu có text liên quan đến viết/bán
              for (const fb of feedBtns) {
                if (/viết|write|bán|sell|post|đăng/i.test(fb.text + fb.label)) {
                  const btn = page.getByText(fb.text, { exact: true }).first();
                  if (await btn.count() > 0) { await btn.click(); triggerClicked = true; break; }
                }
              }
            } catch {}
          }

          if (!triggerClicked) {
            // Log contenteditable elements
            const ceEls = await page.$$eval('[contenteditable]', (els: any[]) =>
              els.slice(0, 8).map((e: any) => ({
                ce: e.getAttribute('contenteditable'),
                ph: e.getAttribute('data-placeholder') || '',
                text: (e.textContent || '').trim().slice(0, 40),
              })));
            this.logger.warn(`${groupSlug}: không thấy ô soạn bài. CE: ${JSON.stringify(ceEls)}`);
            await page.close();
            continue;
          }

          // Đợi marketplace modal load — chờ "Mặt hàng cần bán" trong dialog
          await page.waitForSelector(
            '[role="dialog"] [role="button"]:has-text("Mặt hàng cần bán"), [role="dialog"] [role="button"]:has-text("Item for sale")',
            { timeout: 15000 }
          ).catch(() => {});
          await page.waitForTimeout(1000);

          // Chuyển danh tính sang Fanpage (nếu cấu hình FACEBOOK_PAGE_ID)
          await this.switchToFanpageIdentity(page, groupSlug);

          // Verify dialog vẫn còn sau identity switch
          const dialogAfterSwitch = await page.$('[role="dialog"]');
          if (!dialogAfterSwitch) {
            this.logger.warn(`${groupSlug}: dialog đã đóng sau identity switch — bỏ qua`);
            await page.close();
            continue;
          }

          // Kiểm tra xem có phải marketplace modal không
          // Nếu đã chuyển sang Discussion tab → bỏ qua marketplace flow
          const isMarketplaceModal = !switchedToDiscussion && (
            await page.getByText('Tạo bài niêm yết mới', { exact: false }).count().catch(() => 0) > 0
            || await page.getByText('Create new listing', { exact: false }).count().catch(() => 0) > 0
            || await page.getByText('Mặt hàng cần bán', { exact: false }).count().catch(() => 0) > 0
          );

          let editorEl: any = null;
          let posted = false;

          if (isMarketplaceModal) {
            // Click "Mặt hàng cần bán" để tạo listing sản phẩm
            this.logger.debug(`${groupSlug}: marketplace modal → click Mặt hàng cần bán`);
            let imgPath = '';
            try {
              const itemBtn = page.getByText('Mặt hàng cần bán', { exact: false });
              const itemBtn2 = page.getByText('Item for sale', { exact: false });
              const btn = await itemBtn.count() > 0 ? itemBtn.first() : itemBtn2.first();
              await btn.click({ timeout: 8000 });
              await page.waitForTimeout(5000); // Đợi form listing load

              // Upload ảnh sản phẩm (Facebook Marketplace listing yêu cầu ít nhất 1 ảnh)
              if (p.image) {
                try {
                  imgPath = `/app/fb_data/product_img_${Date.now()}.jpg`;
                  const imgRes = await axios.get(p.image, { responseType: 'arraybuffer', timeout: 10000 });
                  writeFileSync(imgPath, Buffer.from(imgRes.data));
                  const fileInput = await page.$('[role="dialog"] input[type="file"]');
                  if (fileInput) {
                    await page.setInputFiles('[role="dialog"] input[type="file"]', imgPath);
                    await page.waitForTimeout(4000); // Đợi upload hoàn tất
                    this.logger.debug(`${groupSlug}: đã upload ảnh sản phẩm ✅`);
                  }
                } catch (imgErr: any) {
                  this.logger.debug(`${groupSlug}: upload ảnh thất bại: ${imgErr.message?.slice(0, 50)}`);
                }
              }

              // Lấy tất cả visible text inputs (bỏ search bar)
              const visibleInputs = await page.$$('input[type="text"], input:not([type])');
              const formInputs: any[] = [];
              for (const inp of visibleInputs) {
                const vis = await inp.isVisible().catch(() => false);
                const ph = await inp.getAttribute('placeholder').catch(() => '');
                if (vis && ph !== 'Tìm kiếm trên Facebook') formInputs.push(inp);
              }

              // Điền Tiêu đề bằng keyboard typing (thực sự trigger React state)
              if (formInputs.length > 0) {
                await formInputs[0].click({ clickCount: 3 });
                await page.waitForTimeout(200);
                await page.keyboard.press('Backspace');
                await page.keyboard.type(p.name.slice(0, 100), { delay: 25 });
                await page.waitForTimeout(600);
              }
              // Điền Giá bằng keyboard typing
              if (formInputs.length > 1) {
                await formInputs[1].click({ clickCount: 3 });
                await page.waitForTimeout(200);
                await page.keyboard.press('Backspace');
                await page.keyboard.type(String(p.price), { delay: 25 });
                await page.waitForTimeout(600);
              }

              // Chọn Tình trạng (Condition) — bắt buộc, chọn "Mới"
              try {
                const dialog = page.locator('[role="dialog"]');
                // Native select
                const selEl = dialog.locator('select').first();
                if (await selEl.count() > 0 && await selEl.isVisible()) {
                  await selEl.selectOption({ index: 1 });
                  await page.waitForTimeout(500);
                } else {
                  // Custom combobox / div dropdown
                  const combo = dialog.locator('[role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="true"]').first();
                  if (await combo.count() > 0 && await combo.isVisible()) {
                    await combo.click({ force: true, timeout: 5000 });
                    await page.waitForTimeout(1200);
                    // Chọn "Mới" hoặc option đầu tiên trong listbox
                    const newOpt = page.locator('[role="option"]').filter({ hasText: /^Mới/ }).first();
                    const anyOpt = page.locator('[role="option"]').first();
                    if (await newOpt.count() > 0) await newOpt.click({ force: true });
                    else if (await anyOpt.count() > 0) await anyOpt.click({ force: true });
                    await page.waitForTimeout(800);
                  } else {
                    // Keyboard approach: Tab đến condition rồi chọn
                    if (formInputs.length > 1) {
                      await formInputs[1].click();
                      await page.keyboard.press('Tab');
                      await page.waitForTimeout(400);
                      await page.keyboard.press('Space');
                      await page.waitForTimeout(800);
                      await page.keyboard.press('ArrowDown');
                      await page.waitForTimeout(200);
                      await page.keyboard.press('Enter');
                      await page.waitForTimeout(500);
                    }
                  }
                }
              } catch {}

              // Expand "Xem thêm chi tiết" để lộ ô mô tả
              try {
                const expandBtn = page.getByText('Xem thêm chi tiết', { exact: false });
                if (await expandBtn.count() > 0) {
                  await expandBtn.first().click({ timeout: 5000 });
                  await page.waitForTimeout(2000);
                }
              } catch {}

              // Điền mô tả — KHÔNG dùng URL ngoài (Facebook chặn external link)
              try {
                const textAreas = await page.$$('textarea');
                for (const ta of textAreas) {
                  if (await ta.isVisible()) {
                    await ta.click({ timeout: 5000 });
                    await page.waitForTimeout(300);
                    const desc = [p.name, p.category || '', '#deal #muasam #khuyenmai'].filter(Boolean).join('\n');
                    await page.keyboard.type(desc, { delay: 15 });
                    // Blur để trigger React onBlur validation
                    await page.keyboard.press('Tab');
                    await page.waitForTimeout(400);
                    break;
                  }
                }
              } catch {}

              // Xác nhận vị trí nếu chưa có (location picker)
              try {
                const dialog = page.locator('[role="dialog"]');
                const locationInput = dialog.locator('input[placeholder*="thành phố"], input[placeholder*="vị trí"], input[placeholder*="location"], input[placeholder*="city"]').first();
                if (await locationInput.count() > 0 && await locationInput.isVisible()) {
                  const locVal = await locationInput.inputValue().catch(() => '');
                  if (!locVal) {
                    await locationInput.click({ timeout: 5000 });
                    await page.waitForTimeout(1000);
                    const firstSuggestion = page.locator('[role="option"], [role="listitem"]').first();
                    if (await firstSuggestion.count() > 0) {
                      await firstSuggestion.click({ force: true, timeout: 5000 });
                      await page.waitForTimeout(800);
                    } else {
                      await page.keyboard.press('Escape');
                    }
                  }
                }
              } catch {}

              await page.waitForTimeout(800);

              // Duyệt qua nhiều bước "Tiếp" cho đến khi thấy "Đăng" (tối đa 5 bước)
              let stepCount = 0;
              for (let step = 0; step < 5 && !posted; step++) {
                // Cuộn xuống cuối dialog mỗi bước
                try {
                  await page.evaluate(() => {
                    const dialogs = document.querySelectorAll('[role="dialog"]');
                    const last = dialogs[dialogs.length - 1];
                    if (last) last.scrollTop = last.scrollHeight;
                  });
                  await page.waitForTimeout(800);
                } catch {}

                // Thử click Đăng / Post trước
                let foundPost = false;
                for (const label of ['Đăng', 'Post', 'Xuất bản', 'Publish']) {
                  try {
                    const btn = page.locator('[role="dialog"] [role="button"]').filter({ hasText: new RegExp(`^${label}$`, 'i') });
                    if (await btn.count() > 0) {
                      await btn.first().click({ timeout: 8000, force: true });
                      posted = true;
                      sent++;
                      foundPost = true;
                      this.logger.log(`FB Group OK ✅ (listing step ${step}): ${groupSlug}`);
                      break;
                    }
                  } catch {}
                }
                if (foundPost) break;

                // Trước khi click Tiếp: check và click checkbox chưa chọn (để enable nút Tiếp)
                try {
                  const unchecked = page.locator('[role="dialog"] [role="checkbox"]:not([aria-checked="true"])');
                  const checkCnt = await unchecked.count().catch(() => 0);
                  if (checkCnt > 0) {
                    await unchecked.first().click({ force: true, timeout: 5000 });
                    await page.waitForTimeout(600);
                  }
                } catch {}


                // Thử click "Tiếp" — ưu tiên Playwright (fire mouse events), rồi JS fallback
                let clickedNext = false;
                const tiepBtn = page.locator('[role="dialog"] [role="button"]').filter({ hasText: /^Tiếp$/ }).last();
                const tiepCount = await tiepBtn.count().catch(() => 0);
                if (tiepCount > 0) {
                  try {
                    await tiepBtn.scrollIntoViewIfNeeded({ timeout: 3000 });
                    await tiepBtn.click({ force: true, timeout: 6000 });
                    clickedNext = true;
                  } catch {
                    // Fallback: JS click
                    const jsClicked = await page.evaluate(() => {
                      const dialogs = document.querySelectorAll('[role="dialog"]');
                      const allBtns: HTMLElement[] = [];
                      dialogs.forEach(d => {
                        (d.querySelectorAll('[role="button"]') as NodeListOf<HTMLElement>).forEach(b => allBtns.push(b));
                      });
                      const tiepBtns = allBtns.filter(b => {
                        const t = (b.textContent || '').trim();
                        const r = b.getBoundingClientRect();
                        return t === 'Tiếp' && r.width > 0 && r.height > 0;
                      });
                      if (tiepBtns.length === 0) return false;
                      tiepBtns[tiepBtns.length - 1].click();
                      return true;
                    }).catch(() => false);
                    if (jsClicked) clickedNext = true;
                  }
                }
                if (clickedNext) {
                  await page.waitForTimeout(2500);
                  try { await page.screenshot({ path: `/app/fb_data/${groupSlug}_step${step}.png` }); } catch {}
                  stepCount++;
                }
                if (!clickedNext) break;
              }

              if (!posted) {
                const btns = await page.$$eval('[role="dialog"] [role="button"]', (els: any[]) =>
                  els.map((e: any) => (e.textContent || '').trim()).filter(Boolean).slice(0, 10));
                this.logger.warn(`${groupSlug}: marketplace - không tìm thấy nút Đăng sau ${stepCount} bước. btns=${JSON.stringify(btns)}`);
                try { await page.screenshot({ path: `/app/fb_data/${groupSlug}_marketplace_fail.png` }); } catch {}
              }
            } catch (me: any) {
              this.logger.warn(`${groupSlug}: marketplace flow lỗi: ${me.message?.slice(0, 100)}`);
              try { await page.screenshot({ path: `/app/fb_data/${groupSlug}_marketplace_err.png` }); } catch {}
            } finally {
              // Xoá ảnh tạm sau khi dùng xong
              if (imgPath) { try { require('fs').unlinkSync(imgPath); } catch {} }
            }
          } else {
            // Regular post flow
            const editorSelectors = [
              '[contenteditable="true"]',
              '[role="textbox"]',
              'div[data-lexical-editor]',
              'textarea[name="xhpc_message"]',
            ];
            for (const sel of editorSelectors) {
              try {
                const els = await page.$$(sel);
                for (const el of els) {
                  if (await el.isVisible()) { editorEl = el; break; }
                }
                if (editorEl) break;
              } catch {}
            }

            if (!editorEl) {
              const ceEls = await page.$$eval('[contenteditable]', (els: any[]) =>
                els.slice(0, 5).map((e: any) => ({ ce: e.getAttribute('contenteditable'), ph: e.getAttribute('data-placeholder') || '', text: (e.textContent || '').slice(0, 30) })));
              this.logger.warn(`${groupSlug}: không tìm thấy editor. CE: ${JSON.stringify(ceEls)}`);
              await page.close();
              continue;
            }

            // Dùng Playwright click để trigger proper React focus events
            try {
              const editorLoc = page.locator('[role="dialog"] [contenteditable="true"], [role="dialog"] [role="textbox"]').first();
              if (await editorLoc.count() > 0) {
                await editorLoc.click({ timeout: 5000 });
              } else {
                await editorEl.evaluate((e: any) => e.click());
              }
            } catch { await editorEl.evaluate((e: any) => e.click()); }
            await page.waitForTimeout(500);
            await page.keyboard.type(postText, { delay: 15 });
            await page.waitForTimeout(2000);

            // Tìm nút Đăng / Post — dùng force:true vì button có thể aria-disabled
            const dangBtn = page.locator('[role="dialog"] [role="button"]').filter({ hasText: /^Đăng$/ }).last();
            const postBtn = page.locator('[role="dialog"] [role="button"]').filter({ hasText: /^Post$/ }).last();
            for (const btn of [dangBtn, postBtn]) {
              try {
                if (await btn.count() > 0) {
                  await btn.scrollIntoViewIfNeeded({ timeout: 2000 });
                  await btn.click({ force: true, timeout: 8000 });
                  posted = true;
                  sent++;
                  this.logger.log(`FB Group OK ✅: ${groupSlug}`);
                  break;
                }
              } catch {}
            }
            if (!posted) {
              try {
                const btn = await page.$('[data-testid="react-composer-post-button"]');
                if (btn) {
                  await btn.evaluate((e: any) => e.click());
                  posted = true;
                  sent++;
                  this.logger.log(`FB Group OK ✅: ${groupSlug}`);
                }
              } catch {}
            }
            if (!posted) {
              const btns = await page.$$eval('[role="button"],[type="submit"]', (els: any[]) =>
                els.map((e: any) => (e.getAttribute('aria-label') || e.textContent || '').trim()).filter(Boolean).slice(0, 10));
              this.logger.warn(`${groupSlug}: không tìm thấy nút Đăng. ${JSON.stringify(btns)}`);
            }
          }

          await page.waitForTimeout(3000);
        } catch (e: any) {
          this.logger.warn(`FB Group ${groupUrl} lỗi: ${e.message?.slice(0, 100)}`);
          if (e.message?.includes('403') || e.message?.includes('login')) this.sessionValid = false;
        } finally {
          await page.close();
        }
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    // Không đóng browser — giữ persistent context cho lần sau
    return sent;
  }

  logout(): void {
    this.sessionValid = false;
    this.resetBrowser().catch(() => {});
    try { unlinkSync(SESSION_PATH); } catch {}
  }

  private async sendMsgToTelegram(token: string, chatId: string, text: string): Promise<void> {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId, text, parse_mode: 'Markdown',
    }, { timeout: 10000 }).catch(() => {});
  }

  // ─── Target Group Management ──────────────────────────────────────────────

  loadTargetGroups(): FbGroupRecord[] {
    try {
      if (existsSync(TARGET_GROUPS_FILE)) return JSON.parse(readFileSync(TARGET_GROUPS_FILE, 'utf8'));
    } catch {}
    return [];
  }

  saveTargetGroups(groups: FbGroupRecord[]): void {
    writeFileSync(TARGET_GROUPS_FILE, JSON.stringify(groups, null, 2));
  }

  addTargetGroup(url: string, name?: string): FbGroupRecord {
    const groups = this.loadTargetGroups();
    const slug = url.match(/\/groups\/([^/?&#]+)/)?.[1] || url;
    const existing = groups.find(g => g.slug === slug || g.url === url);
    if (existing) return existing;
    const rec: FbGroupRecord = { url, slug, name, status: 'discovered', joinedAt: new Date().toISOString() };
    groups.push(rec);
    this.saveTargetGroups(groups);
    return rec;
  }

  removeTargetGroup(slug: string): boolean {
    const groups = this.loadTargetGroups();
    const filtered = groups.filter(g => g.slug !== slug && g.url !== slug && !g.url.endsWith(`/${slug}`));
    this.saveTargetGroups(filtered);
    return filtered.length < groups.length;
  }

  updateGroupStatus(slug: string, status: FbGroupRecord['status'], extra?: Partial<FbGroupRecord>): void {
    const groups = this.loadTargetGroups();
    const idx = groups.findIndex(g => g.slug === slug || g.url.includes(slug));
    if (idx >= 0) {
      groups[idx] = { ...groups[idx], status, ...extra };
      this.saveTargetGroups(groups);
    }
  }

  // ─── Auto-Scan + Auto-Join Groups ─────────────────────────────────────────

  async autoScanAndJoin(keywords: string[]): Promise<{ discovered: number; joined: number; pending: number }> {
    if (!await this.ensureLoggedIn()) {
      this.logger.warn('autoScanAndJoin: không thể đăng nhập Facebook');
      return { discovered: 0, joined: 0, pending: 0 };
    }

    const { context } = await this.getContext();
    const existingGroups = this.loadTargetGroups();
    const existingSlugs = new Set(existingGroups.map(g => g.slug));

    let discovered = 0;
    let joined = 0;
    let pending = 0;
    const newGroups: FbGroupRecord[] = [];

    for (const kw of keywords) {
      const page = await context.newPage();
      try {
        const searchUrl = `https://www.facebook.com/search/groups/?q=${encodeURIComponent(kw)}`;
        await page.goto(searchUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, 1200));
          await page.waitForTimeout(1500);
        }

        // Lấy group cards với link + tên
        const groupCards: Array<{ url: string; name: string }> = await page.evaluate(() => {
          const cards: Array<{ url: string; name: string }> = [];
          document.querySelectorAll('a[href*="/groups/"]').forEach((a: any) => {
            const href = a.href || '';
            const match = href.match(/facebook\.com\/groups\/([^/?&#]+)/);
            if (!match) return;
            const slug = match[1];
            if (['feed', 'discover', 'create', 'joins', 'requests', 'membership'].includes(slug)) return;
            const name = (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 120);
            if (name) cards.push({ url: `https://www.facebook.com/groups/${slug}`, name });
          });
          return [...new Map(cards.map(c => [c.url, c])).values()].slice(0, 30);
        });

        this.logger.debug(`Scan "${kw}": tìm thấy ${groupCards.length} groups`);

        // Bỏ qua groups không liên quan đến mua sắm/deal/giảm giá
        const IRRELEVANT = /samsung|samsung galaxy|linh sam|sâm núi|sâm việt|sam núi|olive young|đài loan|korea|sim sam|samfans|galavy|wgwe|hers|i\.miss|kimon|studio brand|vĩnh hằng/i;
        const RELEVANT = /mua|bán|sale|deal|giảm|khuyến|săn|shop|hàng|tiki|shopee|lazada|giá|order|online|khuyến mãi|điện tử|nội thất|mẹ.*bé|bỉm|thời trang|làm đẹp/i;

        for (const { url, name } of groupCards) {
          const slug = url.match(/\/groups\/([^/?&#]+)/)?.[1] || url;
          if (existingSlugs.has(slug)) continue;
          if (IRRELEVANT.test(name)) {
            this.logger.debug(`Scan: bỏ qua "${name.slice(0, 40)}" (không liên quan)`);
            continue;
          }
          if (name && !RELEVANT.test(name)) {
            this.logger.debug(`Scan: bỏ qua "${name.slice(0, 40)}" (tên không khớp)`);
            continue;
          }

          existingSlugs.add(slug);
          discovered++;
          const rec: FbGroupRecord = { url, slug, name, status: 'discovered' };
          newGroups.push(rec);
        }
      } catch (e: any) {
        this.logger.debug(`Scan "${kw}" lỗi: ${e.message?.slice(0, 60)}`);
      } finally {
        await page.close();
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    this.logger.log(`Scan xong: ${discovered} groups mới. Đang join...`);

    // Join từng group mới
    for (const rec of newGroups) {
      const page = await context.newPage();
      try {
        await page.goto(rec.url, { timeout: 30000, waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);

        // Lấy tên group chính xác từ h1
        const h1 = await page.$('h1');
        if (h1) {
          const h1Text = (await h1.textContent() || '').trim();
          if (h1Text) rec.name = h1Text;
        }

        // Kiểm tra đã là thành viên chưa
        const isMember = await this.ensureMember(page, rec.slug);
        if (isMember) {
          rec.status = 'member';
          rec.joinedAt = new Date().toISOString();
          joined++;
          this.logger.log(`✅ Join OK (đã là TV): ${rec.slug}`);
        } else {
          // Thử click Join
          const joinLoc = page.locator('[role="button"]').filter({ hasText: /^(Tham gia nhóm|Join group|Join Group|Tham gia)$/ }).first();
          if (await joinLoc.count() > 0) {
            await joinLoc.click({ timeout: 8000 });
            await page.waitForTimeout(3000);
            const nowMember = await this.ensureMember(page, rec.slug);
            if (nowMember) {
              rec.status = 'member';
              rec.joinedAt = new Date().toISOString();
              joined++;
              this.logger.log(`✅ Join OK (công khai): ${rec.slug}`);
            } else {
              rec.status = 'pending';
              pending++;
              this.logger.log(`⏳ Join pending (nhóm kín): ${rec.slug}`);
            }
          } else {
            rec.status = 'pending';
            pending++;
            this.logger.debug(`Không tìm thấy nút Join: ${rec.slug}`);
          }
        }
      } catch (e: any) {
        this.logger.debug(`Join "${rec.slug}" lỗi: ${e.message?.slice(0, 60)}`);
        rec.status = 'discovered';
      } finally {
        await page.close();
      }

      // Thêm vào target list (cả pending lẫn member)
      const existing = this.loadTargetGroups();
      if (!existing.find(g => g.slug === rec.slug)) {
        existing.push(rec);
        this.saveTargetGroups(existing);
      }

      await new Promise(r => setTimeout(r, 3000));
    }

    this.logger.log(`autoScanAndJoin: discovered=${discovered}, joined=${joined}, pending=${pending}`);
    return { discovered, joined, pending };
  }

  // Lấy groups đã là member, ưu tiên chưa post gần đây
  getMemberGroupsForPosting(maxCount: number = 20): FbGroupRecord[] {
    const groups = this.loadTargetGroups();
    const members = groups.filter(g => g.status === 'member');
    // Sắp xếp: chưa post lâu nhất lên đầu
    members.sort((a, b) => {
      const ta = a.lastPostedAt ? new Date(a.lastPostedAt).getTime() : 0;
      const tb = b.lastPostedAt ? new Date(b.lastPostedAt).getTime() : 0;
      return ta - tb;
    });
    return members.slice(0, maxCount);
  }

  markGroupPosted(slug: string): void {
    this.updateGroupStatus(slug, 'member', { lastPostedAt: new Date().toISOString() });
  }

  // ─── Grow Fanpage Followers (Playwright-based) ────────────────────────────

  async inviteGroupReactors(groupPostUrls: string[]): Promise<{ invited: number }> {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageToken = process.env.FACEBOOK_ACCESS_TOKEN;
    let invited = 0;

    if (!pageId || !pageToken) {
      this.logger.debug('inviteGroupReactors: thiếu FACEBOOK_PAGE_ID hoặc FACEBOOK_ACCESS_TOKEN');
      return { invited: 0 };
    }

    // Dùng Graph API: lấy reactions của fanpage posts, mời từng người follow page
    try {
      const postsRes = await axios.get(`https://graph.facebook.com/v19.0/${pageId}/posts`, {
        params: { fields: 'id', limit: 10, access_token: pageToken },
        timeout: 10000,
      });
      const posts: any[] = postsRes.data?.data || [];

      for (const post of posts.slice(0, 5)) {
        try {
          const reactRes = await axios.get(`https://graph.facebook.com/v19.0/${post.id}/reactions`, {
            params: { fields: 'id', limit: 50, access_token: pageToken },
            timeout: 8000,
          });
          const reactors: any[] = reactRes.data?.data || [];
          for (const r of reactors) {
            try {
              await axios.post(
                `https://graph.facebook.com/v19.0/${pageId}/invited_users`,
                null,
                { params: { user: r.id, access_token: pageToken }, timeout: 5000 },
              );
              invited++;
            } catch {}
          }
        } catch {}
      }
    } catch (e: any) {
      this.logger.debug(`inviteGroupReactors lỗi: ${e.message?.slice(0, 60)}`);
    }

    this.logger.log(`inviteGroupReactors: đã mời ${invited} người follow fanpage`);
    return { invited };
  }

  // ─── Chuyển danh tính sang Fanpage trong compose dialog / marketplace modal
  private async switchToFanpageIdentity(page: any, groupSlug: string): Promise<void> {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    if (!pageId) return;

    try {
      // Facebook hiển thị nút chuyển identity gần avatar ở đầu dialog.
      // Thử các selector phổ biến (Tiếng Việt và Tiếng Anh)
      const switcherCandidates = [
        '[role="dialog"] [role="button"][aria-label*="tư cách"]',
        '[role="dialog"] [role="button"][aria-label*="Đăng với"]',
        '[role="dialog"] [role="button"][aria-label*="posting as"]',
        '[role="dialog"] [role="button"][aria-label*="Change who"]',
        '[role="dialog"] [role="button"][aria-label*="Bạn đang đăng"]',
      ];

      let switcherFound = false;
      for (const sel of switcherCandidates) {
        const btn = page.locator(sel).first();
        if (await btn.count() > 0 && await btn.isVisible()) {
          await btn.click({ timeout: 5000 });
          switcherFound = true;
          break;
        }
      }

      if (!switcherFound) return;

      await page.waitForTimeout(1500);

      // Tìm option của Page trong menu vừa mở
      // Thử dùng data-id hoặc href chứa pageId
      const pageOption = page.locator(`[role="option"][data-id="${pageId}"], [role="radio"][data-id="${pageId}"], a[href*="${pageId}"]`).first();
      if (await pageOption.count() > 0) {
        await pageOption.click({ force: true });
        await page.waitForTimeout(800);
        this.logger.debug(`${groupSlug}: đã chuyển sang Fanpage (id=${pageId}) ✅`);
        return;
      }

      // Fallback: chọn option thứ 2 trong danh sách (thứ 1 là personal profile)
      const allOpts = page.locator('[role="option"], [role="radio"]');
      const optCount = await allOpts.count().catch(() => 0);
      if (optCount >= 2) {
        await allOpts.nth(1).click({ force: true });
        await page.waitForTimeout(800);
        this.logger.debug(`${groupSlug}: đã chọn option[1] làm identity ✅`);
        return;
      }

      // Không tìm thấy option — giữ nguyên compose modal, tiếp tục với identity hiện tại
    } catch (e: any) {
      this.logger.debug(`${groupSlug}: switchToFanpageIdentity lỗi: ${e.message?.slice(0, 60)}`);
    }
  }
}
