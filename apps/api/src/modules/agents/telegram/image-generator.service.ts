import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

const SIZE = 1080;
const FONT_FALLBACK = 'Arial, sans-serif';

@Injectable()
export class ImageGeneratorService {
  private readonly logger = new Logger(ImageGeneratorService.name);

  async generateProductCard(opts: {
    name: string;
    price: string;
    category: string;
    imageUrl: string;
    hook: string;
    source: 'tiki' | 'shopee';
  }): Promise<Buffer | null> {
    try {
      // Tải ảnh sản phẩm
      let productImgBuf: Buffer | null = null;
      if (opts.imageUrl) {
        try {
          const res = await axios.get(opts.imageUrl, { responseType: 'arraybuffer', timeout: 8000 });
          productImgBuf = Buffer.from(res.data);
        } catch { /* dùng placeholder nếu không tải được */ }
      }

      const bg = opts.source === 'shopee' ? '#EE4D2D' : '#FF6B35';
      const name = opts.name.slice(0, 60) + (opts.name.length > 60 ? '...' : '');

      // Tạo ảnh nền gradient bằng SVG
      const svgBg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bg};stop-opacity:1"/>
            <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1"/>
          </linearGradient>
          <linearGradient id="overlay" x1="0%" y1="50%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#000;stop-opacity:0"/>
            <stop offset="100%" style="stop-color:#000;stop-opacity:0.85"/>
          </linearGradient>
        </defs>
        <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
        <rect width="${SIZE}" height="${SIZE}" fill="url(#overlay)"/>

        <!-- Hook badge -->
        <rect x="40" y="40" width="280" height="56" rx="28" fill="${bg}"/>
        <text x="180" y="75" font-family="${FONT_FALLBACK}" font-size="22" font-weight="bold"
          fill="white" text-anchor="middle">${this.escXml(opts.hook)}</text>

        <!-- Watermark -->
        <text x="${SIZE - 40}" y="68" font-family="${FONT_FALLBACK}" font-size="20"
          fill="rgba(255,255,255,0.7)" text-anchor="end">t.me/banhang1</text>

        <!-- Tên sản phẩm -->
        ${this.wrapText(name, 60, SIZE - 60, 750, 30, 'white', 42)}

        <!-- Giá -->
        <rect x="60" y="820" width="460" height="80" rx="12" fill="rgba(255,255,255,0.15)"/>
        <text x="80" y="852" font-family="${FONT_FALLBACK}" font-size="22" fill="rgba(255,255,255,0.7)">💰 Giá hôm nay</text>
        <text x="80" y="890" font-family="${FONT_FALLBACK}" font-size="38" font-weight="bold" fill="#FFD700">${this.escXml(opts.price)}</text>

        <!-- Category + Source -->
        <text x="${SIZE - 60}" y="870" font-family="${FONT_FALLBACK}" font-size="22"
          fill="rgba(255,255,255,0.6)" text-anchor="end">${this.escXml(opts.category)}</text>
        <text x="${SIZE - 60}" y="900" font-family="${FONT_FALLBACK}" font-size="20"
          fill="rgba(255,255,255,0.5)" text-anchor="end">${opts.source.toUpperCase()}</text>

        <!-- CTA -->
        <rect x="60" y="940" width="${SIZE - 120}" height="80" rx="40" fill="white"/>
        <text x="${SIZE / 2}" y="990" font-family="${FONT_FALLBACK}" font-size="28" font-weight="bold"
          fill="${bg}" text-anchor="middle">👉 Nhấn link để mua ngay!</text>
      </svg>`;

      const base = sharp(Buffer.from(svgBg));

      if (productImgBuf) {
        // Resize ảnh sản phẩm thành hình vuông 560x560, đặt ở giữa
        const productResized = await sharp(productImgBuf)
          .resize(560, 560, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
          .png()
          .toBuffer();

        return base
          .composite([{ input: productResized, top: 160, left: (SIZE - 560) / 2 }])
          .jpeg({ quality: 90 })
          .toBuffer();
      }

      return base.jpeg({ quality: 90 }).toBuffer();
    } catch (e) {
      this.logger.warn(`generateProductCard lỗi: ${e.message}`);
      return null;
    }
  }

  private escXml(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private wrapText(text: string, x: number, maxWidth: number, y: number, lineHeight: number, color: string, fontSize: number): string {
    const words = text.split(' ');
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.55));
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if ((current + ' ' + word).trim().length > charsPerLine) {
        if (current) lines.push(current.trim());
        current = word;
      } else {
        current = (current + ' ' + word).trim();
      }
    }
    if (current) lines.push(current);

    return lines.slice(0, 3).map((line, i) =>
      `<text x="${x}" y="${y + i * (lineHeight + 8)}" font-family="${FONT_FALLBACK}" font-size="${fontSize}"
        font-weight="bold" fill="${color}">${this.escXml(line)}</text>`
    ).join('\n');
  }
}
