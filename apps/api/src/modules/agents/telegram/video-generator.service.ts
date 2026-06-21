import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath = require('ffmpeg-static');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

const W = 1080;
const H = 1920;
const DURATION = 15;
const FPS = 30;
const FONT = 'Arial, sans-serif';

@Injectable()
export class VideoGeneratorService {
  private readonly logger = new Logger(VideoGeneratorService.name);

  async generateProductVideo(opts: {
    name: string;
    price: string;
    category: string;
    imageUrl: string;
    hook: string;
    source: 'tiki' | 'shopee';
  }): Promise<Buffer | null> {
    const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const tmpDir = os.tmpdir();
    const imgPath = path.join(tmpDir, `deal_${uid}.jpg`);
    const outPath = path.join(tmpDir, `deal_${uid}.mp4`);

    try {
      const cardBuf = await this.createVerticalCard(opts);
      if (!cardBuf) return null;

      fs.writeFileSync(imgPath, cardBuf);
      await this.imageToVideo(imgPath, outPath);

      const videoBuf = fs.readFileSync(outPath);
      return videoBuf;
    } catch (e) {
      this.logger.warn(`generateProductVideo lỗi: ${e.message}`);
      return null;
    } finally {
      for (const f of [imgPath, outPath]) {
        try { fs.unlinkSync(f); } catch { /* ignore */ }
      }
    }
  }

  private async createVerticalCard(opts: {
    name: string;
    price: string;
    category: string;
    imageUrl: string;
    hook: string;
    source: 'tiki' | 'shopee';
  }): Promise<Buffer | null> {
    try {
      let productImgBuf: Buffer | null = null;
      if (opts.imageUrl) {
        try {
          const res = await axios.get(opts.imageUrl, { responseType: 'arraybuffer', timeout: 8000 });
          productImgBuf = Buffer.from(res.data);
        } catch { /* dùng nền trơn nếu không tải được */ }
      }

      const bg = opts.source === 'shopee' ? '#EE4D2D' : '#FF6B35';
      const name = opts.name.slice(0, 80) + (opts.name.length > 80 ? '...' : '');

      const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1"/>
            <stop offset="50%" style="stop-color:${bg};stop-opacity:0.9"/>
            <stop offset="100%" style="stop-color:#0f0f1a;stop-opacity:1"/>
          </linearGradient>
          <linearGradient id="card" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(255,255,255,0.12);stop-opacity:1"/>
            <stop offset="100%" style="stop-color:rgba(255,255,255,0.04);stop-opacity:1"/>
          </linearGradient>
        </defs>

        <!-- Nền -->
        <rect width="${W}" height="${H}" fill="url(#bg)"/>

        <!-- Vòng tròn trang trí -->
        <circle cx="1080" cy="200" r="300" fill="${bg}" fill-opacity="0.15"/>
        <circle cx="0" cy="1700" r="250" fill="${bg}" fill-opacity="0.12"/>

        <!-- Header: Hook badge -->
        <rect x="60" y="80" width="340" height="70" rx="35" fill="${bg}"/>
        <text x="230" y="124" font-family="${FONT}" font-size="26" font-weight="bold"
          fill="white" text-anchor="middle">${this.esc(opts.hook)}</text>

        <!-- Watermark -->
        <text x="${W - 60}" y="124" font-family="${FONT}" font-size="22"
          fill="rgba(255,255,255,0.6)" text-anchor="end">@dealhot.vn</text>

        <!-- Khung ảnh sản phẩm -->
        <rect x="140" y="220" width="800" height="800" rx="32" fill="white" fill-opacity="0.95"/>

        <!-- Source badge -->
        <rect x="${W - 200}" y="240" width="140" height="48" rx="24" fill="${bg}"/>
        <text x="${W - 130}" y="272" font-family="${FONT}" font-size="22" font-weight="bold"
          fill="white" text-anchor="middle">${opts.source.toUpperCase()}</text>

        <!-- Tên sản phẩm -->
        ${this.wrapText(name, 60, W - 60, 1100, 36, 'white', 38)}

        <!-- Divider -->
        <line x1="60" y1="1310" x2="${W - 60}" y2="1310" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>

        <!-- Giá -->
        <text x="60" y="1380" font-family="${FONT}" font-size="26" fill="rgba(255,255,255,0.6)">💰 Giá sale hôm nay</text>
        <text x="60" y="1460" font-family="${FONT}" font-size="72" font-weight="bold" fill="#FFD700">${this.esc(opts.price)}</text>

        <!-- Category -->
        <text x="${W - 60}" y="1460" font-family="${FONT}" font-size="22"
          fill="rgba(255,255,255,0.5)" text-anchor="end">${this.esc(opts.category)}</text>

        <!-- CTA Button -->
        <rect x="60" y="1540" width="${W - 120}" height="100" rx="50" fill="white"/>
        <text x="${W / 2}" y="1603" font-family="${FONT}" font-size="32" font-weight="bold"
          fill="${bg}" text-anchor="middle">👉 Nhấn link trong bio để mua!</text>

        <!-- Hashtags -->
        <text x="${W / 2}" y="1700" font-family="${FONT}" font-size="22"
          fill="rgba(255,255,255,0.45)" text-anchor="middle">#dealngon #muahàng #giảmgiá #${opts.source}</text>

        <!-- TikTok handle area -->
        <text x="${W / 2}" y="1820" font-family="${FONT}" font-size="24"
          fill="rgba(255,255,255,0.35)" text-anchor="middle">🔔 Follow để nhận deal mỗi ngày!</text>
      </svg>`;

      const base = sharp(Buffer.from(svg));

      if (productImgBuf) {
        const productResized = await sharp(productImgBuf)
          .resize(720, 720, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .jpeg({ quality: 95 })
          .toBuffer();

        return base
          .composite([{ input: productResized, top: 260, left: (W - 720) / 2 }])
          .jpeg({ quality: 88 })
          .toBuffer();
      }

      return base.jpeg({ quality: 88 }).toBuffer();
    } catch (e) {
      this.logger.warn(`createVerticalCard lỗi: ${e.message}`);
      return null;
    }
  }

  private imageToVideo(imgPath: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const totalFrames = DURATION * FPS;
      ffmpeg()
        .input(imgPath)
        .inputOptions(['-loop 1'])
        .videoFilters([
          // Đảm bảo kích thước đúng 1080x1920
          `scale=${W}:${H}:force_original_aspect_ratio=increase`,
          `crop=${W}:${H}`,
          // Ken Burns effect: zoom từ 1.0 đến 1.2 trong 15 giây
          `zoompan=z='min(zoom+0.0013,1.2)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}`,
          'format=yuv420p',
        ])
        .outputOptions([
          `-t ${DURATION}`,
          `-r ${FPS}`,
          '-c:v libx264',
          '-preset fast',
          '-crf 26',
          '-pix_fmt yuv420p',
          '-movflags +faststart',
        ])
        .output(outPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  private esc(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private wrapText(text: string, x: number, maxX: number, y: number, lineH: number, color: string, size: number): string {
    const maxWidth = maxX - x;
    const charsPerLine = Math.floor(maxWidth / (size * 0.55));
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const candidate = cur ? `${cur} ${w}` : w;
      if (candidate.length > charsPerLine && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = candidate;
      }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3).map((line, i) =>
      `<text x="${x}" y="${y + i * (lineH + 6)}" font-family="${FONT}" font-size="${size}"
        font-weight="bold" fill="${color}">${this.esc(line)}</text>`
    ).join('\n');
  }
}
