/**
 * Script lấy YouTube OAuth2 refresh_token
 *
 * Cách dùng:
 *   node scripts/youtube-auth.js
 *
 * Cần chuẩn bị trước:
 *   1. Vào https://console.cloud.google.com
 *   2. Tạo project (hoặc chọn project cũ)
 *   3. APIs & Services → Enable APIs → tìm "YouTube Data API v3" → Enable
 *   4. APIs & Services → Credentials → Create Credentials → OAuth client ID
 *      - Application type: Desktop app
 *      - Tên tùy ý (vd: "Commerce Video Uploader")
 *      - Download JSON → copy CLIENT_ID và CLIENT_SECRET vào .env
 *   5. OAuth consent screen → thêm email của bạn vào "Test users"
 */

const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load .env
const envPath = path.join(__dirname, '../.env');
const envVars = {};
try {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.startsWith('#')) {
      envVars[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    }
  });
} catch {}

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || envVars.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || envVars.YOUTUBE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(`
❌ Chưa có YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET

Làm theo các bước sau:

1. Mở https://console.cloud.google.com
2. Tạo project mới hoặc chọn project cũ
3. APIs & Services → Library → tìm "YouTube Data API v3" → Enable
4. APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID
   - Application type: Desktop app
   - Tên: "Video Pipeline"
5. Copy Client ID và Client Secret
6. Thêm vào .env:
   YOUTUBE_CLIENT_ID=your_client_id
   YOUTUBE_CLIENT_SECRET=your_client_secret
7. Chạy lại: node scripts/youtube-auth.js
`);
  process.exit(1);
}

const REDIRECT_PORT = 8765;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\n🎬 YouTube OAuth2 — Lấy refresh token\n');
console.log('📋 Mở URL này trong trình duyệt:\n');
console.log(authUrl);
console.log('\n⏳ Đang chờ callback trên cổng', REDIRECT_PORT, '...\n');

// Local HTTP server để nhận callback
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname !== '/callback') {
    res.end('Waiting...');
    return;
  }

  const code = parsed.query.code;
  if (!code) {
    res.end('<h2>❌ Không có code trong callback</h2>');
    server.close();
    return;
  }

  res.end('<h2>✅ Đã nhận được code! Quay lại terminal để xem kết quả.</h2><p>Bạn có thể đóng tab này.</p>');

  // Exchange code → tokens
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  }).toString();

  const tokenData = await new Promise((resolve, reject) => {
    const req2 = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (r) => {
      let data = '';
      r.on('data', d => data += d);
      r.on('end', () => resolve(JSON.parse(data)));
    });
    req2.on('error', reject);
    req2.write(body);
    req2.end();
  });

  server.close();

  if (tokenData.error) {
    console.error('❌ Lỗi:', tokenData.error_description || tokenData.error);
    return;
  }

  const refreshToken = tokenData.refresh_token;
  const accessToken = tokenData.access_token;

  console.log('\n✅ Lấy token thành công!\n');
  console.log('YOUTUBE_REFRESH_TOKEN:', refreshToken);
  console.log('YOUTUBE_ACCESS_TOKEN :', accessToken, '(hết hạn sau 1h, không cần lưu)\n');

  // Cập nhật .env
  let envContent = fs.readFileSync(envPath, 'utf8');

  const updateOrAdd = (key, val) => {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(envContent)) {
      envContent = envContent.replace(re, `${key}=${val}`);
    } else {
      envContent += `\n${key}=${val}`;
    }
  };

  updateOrAdd('YOUTUBE_REFRESH_TOKEN', refreshToken);
  updateOrAdd('YOUTUBE_CLIENT_ID', CLIENT_ID);
  updateOrAdd('YOUTUBE_CLIENT_SECRET', CLIENT_SECRET);

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Đã lưu vào .env\n');
  console.log('Bước tiếp: reload PM2 để áp dụng:');
  console.log('  ~/.nvm/versions/node/v20.20.2/lib/node_modules/pm2/bin/pm2 startOrReload ecosystem.config.js --only commerce-api\n');
});

server.listen(REDIRECT_PORT, () => {});
