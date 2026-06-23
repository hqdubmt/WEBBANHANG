const fs = require('fs');
const path = require('path');

// CI/CD writes secrets to .env in project root — read it here so PM2 never
// needs hardcoded credentials in this file (which is committed to git).
function loadEnvFile(filePath) {
  try {
    return Object.fromEntries(
      fs.readFileSync(filePath, 'utf8')
        .split('\n')
        .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
        .map(l => {
          const idx = l.indexOf('=');
          const key = l.slice(0, idx).trim();
          const val = l.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          return [key, val];
        })
    );
  } catch (_) {
    return {};
  }
}

const e = loadEnvFile(path.join(__dirname, '.env'));

module.exports = {
  apps: [
    {
      name: 'commerce-api',
      cwd: '/home/hqdu/quangdu/webbanhang/apps/api',
      script: 'dist/main.js',
      interpreter: 'node',
      env: {
        TZ: 'Asia/Ho_Chi_Minh',
        NODE_ENV: e.NODE_ENV || 'production',
        APP_PORT: e.APP_PORT || 3004,
        APP_SECRET: e.APP_SECRET,
        ALLOWED_ORIGINS: e.ALLOWED_ORIGINS || '',
        POSTGRES_HOST: e.POSTGRES_HOST || 'localhost',
        POSTGRES_PORT: e.POSTGRES_PORT || 5432,
        POSTGRES_USER: e.POSTGRES_USER || 'commerce_user',
        POSTGRES_PASSWORD: e.POSTGRES_PASSWORD,
        POSTGRES_DB: e.POSTGRES_DB || 'ai_commerce',
        REDIS_HOST: e.REDIS_HOST || 'localhost',
        REDIS_PORT: e.REDIS_PORT || 6380,
        REDIS_PASSWORD: e.REDIS_PASSWORD,
        QDRANT_URL: e.QDRANT_URL || 'http://localhost:6333',
        OLLAMA_URL: e.OLLAMA_URL || 'http://localhost:11434',
        OLLAMA_MODEL: e.OLLAMA_MODEL || 'qwen2.5:1.5b',
        OLLAMA_VIDEO_MODEL: e.OLLAMA_VIDEO_MODEL || 'qwen2.5:7b',
        PIPER_DIR: e.PIPER_DIR || '/home/hqdu/piper',
        PIPER_MODEL: e.PIPER_MODEL || 'vi_VN-vais1000-medium',
        RSS_FEED_URLS: e.RSS_FEED_URLS || '',
        GOOGLE_SHEETS_ID: e.GOOGLE_SHEETS_ID || '',
        GOOGLE_SERVICE_ACCOUNT_JSON: e.GOOGLE_SERVICE_ACCOUNT_JSON || '',
        YOUTUBE_ACCESS_TOKEN: e.YOUTUBE_ACCESS_TOKEN || '',
        YOUTUBE_CLIENT_ID: e.YOUTUBE_CLIENT_ID || '',
        YOUTUBE_CLIENT_SECRET: e.YOUTUBE_CLIENT_SECRET || '',
        YOUTUBE_REFRESH_TOKEN: e.YOUTUBE_REFRESH_TOKEN || '',
        OPENROUTER_API_KEY: e.OPENROUTER_API_KEY,
        OPENAI_API_KEY: e.OPENAI_API_KEY,
        MINIO_ROOT_USER: e.MINIO_ROOT_USER,
        MINIO_ROOT_PASSWORD: e.MINIO_ROOT_PASSWORD,
        MINIO_PORT: e.MINIO_PORT || 9000,
        ACCESSTRADE_API_KEY: e.ACCESSTRADE_API_KEY,
        ACCESSTRADE_PID: e.ACCESSTRADE_PID,
        ACCESSTRADE_TIKI_AID: e.ACCESSTRADE_TIKI_AID,
        ACCESSTRADE_TIKI_COMMISSION: e.ACCESSTRADE_TIKI_COMMISSION || '8',
        FACEBOOK_PAGE_ID: e.FACEBOOK_PAGE_ID,
        FACEBOOK_ACCESS_TOKEN: e.FACEBOOK_ACCESS_TOKEN,
        TELEGRAM_BOT_TOKEN: e.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHANNEL_ID: e.TELEGRAM_CHANNEL_ID,
        TELEGRAM_GROUP_IDS: e.TELEGRAM_GROUP_IDS || '',
        DISCORD_WEBHOOK_URL: e.DISCORD_WEBHOOK_URL,
        DISCORD_WEBHOOK_URLS: e.DISCORD_WEBHOOK_URLS || '',
        MAKE_FACEBOOK_WEBHOOK: e.MAKE_FACEBOOK_WEBHOOK || '',
        MAKE_YOUTUBE_WEBHOOK: e.MAKE_YOUTUBE_WEBHOOK || '',
        MAKE_REELS_WEBHOOK: e.MAKE_REELS_WEBHOOK || '',
        IMGBB_API_KEY: e.IMGBB_API_KEY || '',
        ZALO_OA_ACCESS_TOKEN: e.ZALO_OA_ACCESS_TOKEN,
        N8N_WEBHOOK_URL: e.N8N_WEBHOOK_URL,
        ACCESSTRADE_SHOPEE_AID: e.ACCESSTRADE_SHOPEE_AID || '',
        WEB_URL: e.WEB_URL || '',
        WEB_PORT: e.WEB_PORT || '3005',
        SMTP_HOST: e.SMTP_HOST,
        SMTP_PORT: e.SMTP_PORT || '587',
        SMTP_USER: e.SMTP_USER,
        SMTP_PASSWORD: e.SMTP_PASSWORD,
        SMTP_FROM_NAME: e.SMTP_FROM_NAME || 'AI Commerce',
        JWT_ACCESS_EXPIRES: e.JWT_ACCESS_EXPIRES,
        JWT_REFRESH_EXPIRES: e.JWT_REFRESH_EXPIRES,
        WEBHOOK_SECRET: e.WEBHOOK_SECRET,
        BANK_BIN: e.BANK_BIN,
        BANK_SHORT_NAME: e.BANK_SHORT_NAME,
        BANK_ACCOUNT_NUMBER: e.BANK_ACCOUNT_NUMBER,
        BANK_ACCOUNT_NAME: e.BANK_ACCOUNT_NAME,
        FACEBOOK_GROUP_URLS: e.FACEBOOK_GROUP_URLS || '',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/home/hqdu/quangdu/webbanhang/logs/api-error.log',
      out_file: '/home/hqdu/quangdu/webbanhang/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'commerce-web',
      cwd: '/home/hqdu/quangdu/webbanhang/apps/web',
      script: 'node',
      args: `.next/standalone/quangdu/webbanhang/apps/web/server.js`,
      env: {
        NODE_ENV: 'production',
        PORT: e.WEB_PORT || 3005,
        HOSTNAME: '0.0.0.0',
        API_HOST: e.API_HOST || 'localhost',
        API_PORT: e.API_PORT || '3004',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/home/hqdu/quangdu/webbanhang/logs/web-error.log',
      out_file: '/home/hqdu/quangdu/webbanhang/logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
