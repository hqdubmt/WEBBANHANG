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
        NODE_ENV: e.NODE_ENV || 'production',
        APP_PORT: e.APP_PORT || 3002,
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
        OPENROUTER_API_KEY: e.OPENROUTER_API_KEY,
        OPENAI_API_KEY: e.OPENAI_API_KEY,
        MINIO_ROOT_USER: e.MINIO_ROOT_USER,
        MINIO_ROOT_PASSWORD: e.MINIO_ROOT_PASSWORD,
        MINIO_PORT: e.MINIO_PORT || 9000,
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
      script: 'node_modules/.bin/next',
      args: 'start -p 3003',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        API_HOST: e.API_HOST || 'localhost',
        API_PORT: e.API_PORT || '3002',
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
