import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import axios from 'axios';
import { AiService } from '../../ai/ai.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath = require('ffmpeg-static');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

interface ContentItem {
  title: string;
  description: string;
  image: string;
  link: string;
  source: 'rss' | 'shopee' | 'tiktok_shop' | 'website';
}

interface VideoScript {
  title: string;
  script: string;
  description: string;
  hashtags: string[];
}

export interface UploadResult {
  youtube?: string;
  facebookReels?: string;
  tiktok?: string;
}

@Injectable()
export class AiVideoPipelineService {
  private readonly logger = new Logger(AiVideoPipelineService.name);

  constructor(private readonly aiService: AiService) {}

  // Scheduler: 9h và 15h mỗi ngày
  @Cron('0 9,15 * * *')
  async runScheduled() {
    this.logger.log('AI Video Pipeline: chạy scheduled...');
    await this.run(3);
  }

  async run(count = 3): Promise<{ generated: number; uploads: UploadResult[] }> {
    const items = await this.fetchContent(count);
    const uploads: UploadResult[] = [];

    for (const item of items) {
      const audioPath = path.join(os.tmpdir(), `voice_${Date.now()}.wav`);
      const videoPath = path.join(os.tmpdir(), `video_${Date.now()}.mp4`);
      try {
        const script = await this.generateScript(item);
        const voiceOk = await this.generateVoice(script.script, audioPath);
        await this.renderVideo(item, script, voiceOk ? audioPath : '', videoPath);
        const upload = await this.upload(videoPath, script);
        await this.logToSheets(item, script, upload);
        uploads.push(upload);
      } catch (e: any) {
        this.logger.error(`Pipeline lỗi [${item.title.slice(0, 40)}]: ${e.message}`);
      } finally {
        for (const f of [audioPath, videoPath]) {
          try { fs.unlinkSync(f); } catch {}
        }
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    return { generated: uploads.length, uploads };
  }

  // ─── 1. Fetch content ─────────────────────────────────────────────────────

  private async fetchContent(count: number): Promise<ContentItem[]> {
    const items: ContentItem[] = [];

    // RSS feeds
    const rssUrls = (process.env.RSS_FEED_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const url of rssUrls.slice(0, 2)) {
      try {
        const res = await axios.get(url, { timeout: 8000 });
        const entries = (res.data as string).match(/<item[^>]*>([\s\S]*?)<\/item>/g) || [];
        for (const e of entries.slice(0, 2)) {
          const title = e.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || '';
          const link = e.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] || '';
          const desc = (e.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description[^>]*>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<[^>]*>/g, '').slice(0, 200);
          if (title.trim()) items.push({ title: title.trim(), description: desc.trim(), image: '', link, source: 'rss' });
        }
      } catch { /* bỏ qua */ }
    }

    // Tiki API (reliable hơn Shopee)
    if (items.length < count) {
      const TIKI_CATS = [1789, 8322, 1520, 1883, 8371];
      const catId = TIKI_CATS[Math.floor(Math.random() * TIKI_CATS.length)];
      try {
        const res = await axios.get('https://tiki.vn/api/v2/products', {
          params: { limit: count + 3, sort: 'top_seller', category: catId, page: 1 },
          headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', 'Referer': 'https://tiki.vn', 'Accept': 'application/json' },
          timeout: 10000,
        });
        for (const p of (res.data?.data || [])) {
          if (items.length >= count) break;
          if (!p.url_key || !p.price || p.price <= 0) continue;
          const url = `https://tiki.vn/${p.url_key}.html`;
          const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
          items.push({
            title: p.name || '',
            description: `Sản phẩm bán chạy trên Tiki, giá ${pf}`,
            image: p.thumbnail_url || '',
            link: url,
            source: 'website',
          });
        }
      } catch { /* ignore */ }
    }

    // Shopee (fallback thêm nếu Tiki chưa đủ)
    if (items.length < count) {
      try {
        const res = await axios.get('https://shopee.vn/api/v4/search/search_items', {
          params: { by: 'sales', keyword: 'bán chạy', limit: count, newest: 0, order: 'desc', page_type: 'search', version: 2 },
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://shopee.vn/' },
          timeout: 8000,
        });
        for (const item of (res.data?.items || [])) {
          if (items.length >= count) break;
          const p = item.item_basic || item;
          if (!p?.name) continue;
          const price = Math.round(Number(p.price || 0) / 100000);
          const url = `https://shopee.vn/${(p.name as string).replace(/\s+/g, '-')}-i.${p.shopid}.${p.itemid}`;
          items.push({
            title: p.name,
            description: `Sản phẩm hot trên Shopee, giá ${price.toLocaleString('vi-VN')}đ`,
            image: p.image ? `https://down-vn.img.susercontent.com/file/${p.image}` : '',
            link: url,
            source: 'shopee',
          });
        }
      } catch { /* ignore */ }
    }

    // TikTok Shop
    const tiktokShopUrl = process.env.TIKTOK_SHOP_URL;
    if (tiktokShopUrl && items.length < count) {
      items.push({
        title: 'Deal Hot TikTok Shop hôm nay',
        description: 'Hàng ngàn sản phẩm chất lượng, giá tốt — Flash sale mỗi ngày trên TikTok Shop!',
        image: '',
        link: tiktokShopUrl,
        source: 'tiktok_shop',
      });
    }

    return items.slice(0, count);
  }

  // ─── 2. Ollama (qua AiService có sẵn): Tiêu đề, Kịch bản, Mô tả, Hashtag ─

  private async generateScript(item: ContentItem): Promise<VideoScript> {
    const prompt = `Chủ đề: "${item.title}"
Mô tả: ${item.description}
Link: ${item.link}

Trả về JSON hợp lệ:
{
  "title": "tiêu đề video hấp dẫn tối đa 100 ký tự",
  "script": "kịch bản lời thoại đầy đủ 60-80 giây, văn nói tự nhiên tiếng Việt",
  "description": "mô tả video 150-200 ký tự kèm link mua hàng",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}`;

    const systemPrompt = 'Bạn là content creator video ngắn chuyên nghiệp. Chỉ trả về JSON hợp lệ, không giải thích thêm.';

    try {
      const script = await this.aiService.parseJson<VideoScript>(prompt, systemPrompt);
      if (script.title && script.script) return script;
    } catch (e: any) {
      this.logger.warn(`AI generateScript lỗi: ${e.message}`);
    }

    // Fallback
    return {
      title: item.title.slice(0, 100),
      script: `Xin chào! Hôm nay mình giới thiệu ${item.title}. ${item.description}. Link mua hàng ở trong bio nhé!`,
      description: `${item.description.slice(0, 150)} 👉 ${item.link}`,
      hashtags: ['#muasam', '#deal', '#viral', '#review', '#tiktok'],
    };
  }

  // ─── 3. Piper TTS: Tạo giọng đọc (CLI binary) ────────────────────────────

  private async generateVoice(text: string, outPath: string): Promise<boolean> {
    const piperDir = process.env.PIPER_DIR || '/home/hqdu/piper';
    const modelName = process.env.PIPER_MODEL || 'vi_VN-vais1000-medium';
    const piperBin = path.join(piperDir, 'piper');
    const modelPath = path.join(piperDir, 'models', `${modelName}.onnx`);

    if (!fs.existsSync(piperBin) || !fs.existsSync(modelPath)) {
      this.logger.warn(`Piper binary/model không tìm thấy tại ${piperDir}`);
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const proc = spawn(piperBin, [
        '--model', modelPath,
        '--output-file', outPath,
        '--quiet',
      ], {
        env: { ...process.env, LD_LIBRARY_PATH: piperDir },
      });

      proc.stdin.write(text, 'utf8');
      proc.stdin.end();

      proc.on('close', (code) => {
        const ok = code === 0 && fs.existsSync(outPath);
        if (ok) {
          const size = fs.statSync(outPath).size;
          this.logger.log(`Piper TTS: ${path.basename(outPath)} (${Math.round(size / 1024)}KB)`);
        } else {
          this.logger.warn(`Piper TTS exit code ${code}`);
        }
        resolve(ok);
      });

      proc.on('error', (e) => {
        this.logger.warn(`Piper TTS lỗi: ${e.message}`);
        resolve(false);
      });
    });
  }

  // ─── 4. FFmpeg: Tạo video dọc 1080x1920 ──────────────────────────────────

  private async renderVideo(item: ContentItem, script: VideoScript, audioPath: string, outPath: string): Promise<void> {
    const imgPath = path.join(os.tmpdir(), `frame_${Date.now()}.jpg`);
    try {
      await this.createBackground(item, script, imgPath);
      await this.ffmpegCompose(imgPath, audioPath, outPath);
    } finally {
      try { fs.unlinkSync(imgPath); } catch {}
    }
  }

  private async createBackground(item: ContentItem, script: VideoScript, outPath: string): Promise<void> {
    const W = 1080, H = 1920;

    let productBuf: Buffer | null = null;
    if (item.image) {
      try {
        const res = await axios.get(item.image, { responseType: 'arraybuffer', timeout: 8000 });
        productBuf = Buffer.from(res.data as ArrayBuffer);
      } catch {}
    }

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const srcColor = item.source === 'shopee' ? '#EE4D2D' : item.source === 'tiktok_shop' ? '#FF0050' : '#0066FF';
    const title1 = esc(item.title.slice(0, 45));
    const title2 = esc(item.title.slice(45, 85));
    const tags = (script.hashtags || []).slice(0, 3).map(h => esc(h.replace(/^#/, ''))).join(' #');

    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#0a0a1a"/>
          <stop offset="100%" style="stop-color:#1a1a3e"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <circle cx="1080" cy="350" r="420" fill="${srcColor}" fill-opacity="0.1"/>
      <circle cx="0" cy="1550" r="380" fill="${srcColor}" fill-opacity="0.08"/>

      <!-- Khung ảnh sản phẩm -->
      <rect x="60" y="200" width="960" height="930" rx="32" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>

      <!-- Source badge -->
      <rect x="60" y="1210" width="960" height="200" rx="20" fill="${srcColor}" fill-opacity="0.85"/>
      <text x="540" y="1325" font-family="Arial,sans-serif" font-size="42" font-weight="bold" fill="white" text-anchor="middle">${title1}</text>
      <text x="540" y="1375" font-family="Arial,sans-serif" font-size="32" fill="rgba(255,255,255,0.85)" text-anchor="middle">${title2}</text>

      <!-- CTA -->
      <rect x="180" y="1490" width="720" height="90" rx="45" fill="white"/>
      <text x="540" y="1546" font-family="Arial,sans-serif" font-size="32" font-weight="bold" fill="${srcColor}" text-anchor="middle">👉 Link trong bio để mua ngay!</text>

      <!-- Hashtags -->
      <text x="540" y="1700" font-family="Arial,sans-serif" font-size="28" fill="rgba(255,255,255,0.45)" text-anchor="middle">#${tags}</text>

      <!-- Follow CTA -->
      <text x="540" y="1840" font-family="Arial,sans-serif" font-size="24" fill="rgba(255,255,255,0.3)" text-anchor="middle">🔔 Follow để nhận deal mỗi ngày!</text>
    </svg>`;

    const base = sharp(Buffer.from(svg));
    if (productBuf) {
      const resized = await sharp(productBuf)
        .resize(860, 860, { fit: 'contain', background: { r: 15, g: 15, b: 30, alpha: 1 } })
        .jpeg({ quality: 90 })
        .toBuffer();
      await base.composite([{ input: resized, top: 230, left: 110 }]).jpeg({ quality: 90 }).toFile(outPath);
    } else {
      await base.jpeg({ quality: 90 }).toFile(outPath);
    }
  }

  private ffmpegCompose(imgPath: string, audioPath: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cmd = ffmpeg();
      const hasAudio = audioPath && fs.existsSync(audioPath);

      cmd.input(imgPath).inputOptions(['-loop 1']);
      if (hasAudio) cmd.input(audioPath);

      cmd.videoFilters([
        'scale=1080:1920:force_original_aspect_ratio=increase',
        'crop=1080:1920',
        'zoompan=z=\'min(zoom+0.0008,1.1)\':d=9000:x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':s=1080x1920',
        'format=yuv420p',
      ]);

      const outputOpts = [
        '-c:v libx264', '-preset fast', '-crf 23', '-pix_fmt yuv420p',
        '-movflags +faststart',
      ];

      if (hasAudio) {
        outputOpts.push('-c:a aac', '-b:a 128k', '-shortest');
      } else {
        outputOpts.push('-t 60', '-r 30');
      }

      cmd.outputOptions(outputOpts)
        .output(outPath)
        .on('end', () => { this.logger.log(`FFmpeg OK → ${path.basename(outPath)}`); resolve(); })
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  // ─── 5. Upload qua Make.com (không cần API token) ───────────────────────

  private async upload(videoPath: string, script: VideoScript): Promise<UploadResult> {
    const result: UploadResult = {};
    const tags = (script.hashtags || []).join(' ');
    const fullDesc = `${script.description}\n\n${tags}`;

    // Upload video lên MinIO để Make.com tải về
    const videoUrl = await this.uploadToMinio(videoPath);

    const [yt, fb, tk] = await Promise.allSettled([
      this.sendToMakeYouTube(videoUrl, script.title, fullDesc, script.hashtags),
      this.sendToMakeFacebookReels(videoUrl, script.title, `${script.title}\n\n${fullDesc}`),
      this.saveTikTokQueue(videoPath),
    ]);

    if (yt.status === 'fulfilled' && yt.value) result.youtube = yt.value;
    else if (yt.status === 'rejected') this.logger.debug(`Make YouTube: ${yt.reason?.message}`);

    if (fb.status === 'fulfilled' && fb.value) result.facebookReels = fb.value;
    else if (fb.status === 'rejected') this.logger.debug(`Make FB Reels: ${fb.reason?.message}`);

    if (tk.status === 'fulfilled' && tk.value) result.tiktok = tk.value;

    return result;
  }

  // Upload video lên MinIO → trả về presigned URL (public 1 giờ)
  private async uploadToMinio(videoPath: string): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Minio = require('minio');

    const host = process.env.MINIO_HOST || '127.0.0.1';
    const port = parseInt(process.env.MINIO_PORT || '9000');
    const accessKey = process.env.MINIO_ROOT_USER || 'minioadmin';
    const secretKey = process.env.MINIO_ROOT_PASSWORD || '';
    const bucket = process.env.MINIO_BUCKET_VIDEOS || 'videos';
    // URL công khai (Make.com cần tải từ internet)
    const publicHost = (process.env.WEB_URL || `http://${host}`).replace(/\/$/, '');
    const publicUrl = `${publicHost}:${port}`;

    const client = new Minio.Client({ endPoint: host, port, useSSL: false, accessKey, secretKey });

    try {
      const exists = await client.bucketExists(bucket);
      if (!exists) {
        await client.makeBucket(bucket, 'us-east-1');
        // Set bucket public để Make.com tải không cần presign
        await client.setBucketPolicy(bucket, JSON.stringify({
          Version: '2012-10-17',
          Statement: [{ Effect: 'Allow', Principal: { AWS: ['*'] }, Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${bucket}/*`] }],
        }));
      }
    } catch { /* bucket đã tồn tại */ }

    const objectName = `pipeline/video_${Date.now()}.mp4`;
    await client.fPutObject(bucket, objectName, videoPath, { 'Content-Type': 'video/mp4' });

    // URL công khai qua nginx proxy /storage/ (port 8080)
    const webPort = process.env.NGINX_PORT || '8080';
    const finalUrl = `${publicHost}:${webPort}/storage/${objectName}`;
    this.logger.log(`MinIO upload OK: ${objectName}`);
    return finalUrl;
  }

  // Gửi webhook đến Make.com scenario YouTube
  private async sendToMakeYouTube(
    videoUrl: string | null,
    title: string,
    description: string,
    hashtags: string[],
  ): Promise<string | undefined> {
    const webhookUrl = process.env.MAKE_YOUTUBE_WEBHOOK;
    if (!webhookUrl || !videoUrl) return undefined;

    await axios.post(webhookUrl, {
      video_url: videoUrl,
      title: title.slice(0, 100),
      description: description.slice(0, 5000),
      tags: hashtags.map(h => h.replace(/^#/, '')),
      category_id: '22',
      privacy: 'public',
      language: 'vi',
    }, { timeout: 30000 });

    this.logger.log(`Make YouTube webhook OK: ${title.slice(0, 40)}`);
    return 'queued_youtube';
  }

  // Gửi webhook đến Make.com scenario Facebook Reels
  private async sendToMakeFacebookReels(
    videoUrl: string | null,
    title: string,
    message: string,
  ): Promise<string | undefined> {
    const webhookUrl = process.env.MAKE_REELS_WEBHOOK;
    if (!webhookUrl || !videoUrl) return undefined;

    await axios.post(webhookUrl, {
      video_url: videoUrl,
      title: title.slice(0, 100),
      message: message.slice(0, 2200),
      type: 'reel',
    }, { timeout: 30000 });

    this.logger.log(`Make Facebook Reels webhook OK`);
    return 'queued_reels';
  }

  // Lưu video vào queue cho TikTokUploaderService xử lý
  private async saveTikTokQueue(videoPath: string): Promise<string | undefined> {
    const tiktokDir = path.join(os.tmpdir(), 'tiktok_videos');
    if (!fs.existsSync(tiktokDir)) fs.mkdirSync(tiktokDir, { recursive: true });
    const dest = path.join(tiktokDir, `pipeline_${Date.now()}.mp4`);
    fs.copyFileSync(videoPath, dest);
    this.logger.log(`TikTok queue: ${dest}`);
    return dest;
  }

  // ─── 6. Google Sheets: Lưu trạng thái ───────────────────────────────────

  private async logToSheets(item: ContentItem, script: VideoScript, upload: UploadResult): Promise<void> {
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!sheetId || !saJson) return;

    try {
      const sa = JSON.parse(saJson);
      const token = await this.getServiceAccountToken(sa, 'https://www.googleapis.com/auth/spreadsheets');

      const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const row = [
        now,
        item.source,
        item.title.slice(0, 100),
        script.title.slice(0, 100),
        upload.youtube || '',
        upload.facebookReels ? 'Reels OK' : '',
        upload.tiktok ? 'Queued' : '',
        (script.hashtags || []).join(', '),
      ];

      await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append`,
        { values: [row], majorDimension: 'ROWS' },
        {
          params: { valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS' },
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );
      this.logger.log('Google Sheets: log OK');
    } catch (e: any) {
      this.logger.debug(`Google Sheets lỗi: ${e.message}`);
    }
  }

  // JWT cho Service Account (RS256)
  private async getServiceAccountToken(sa: any, scope: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: sa.client_email, scope,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now, exp: now + 3600,
    })).toString('base64url');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const sig = sign.sign(sa.private_key, 'base64url');

    const res = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${payload}.${sig}`,
    }, { timeout: 10000 });

    return res.data.access_token;
  }
}
