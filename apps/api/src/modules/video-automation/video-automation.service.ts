import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import axios from 'axios';
import { AiService } from '../ai/ai.service';
import { VideoAutomationRun, RunStatus, RunSource } from './entities/video-automation-run.entity';
import { VideoSource, SourceType } from './entities/video-source.entity';

interface StoryItem {
  title: string;
  content: string;
  image: string;
  link: string;
  source: RunSource;
}

interface VideoScript {
  title: string;
  script: string;
  description: string;
  hashtags: string[];
}

@Injectable()
export class VideoAutomationService {
  private readonly logger = new Logger(VideoAutomationService.name);

  constructor(
    @InjectRepository(VideoAutomationRun)
    private readonly runRepo: Repository<VideoAutomationRun>,
    @InjectRepository(VideoSource)
    private readonly sourceRepo: Repository<VideoSource>,
    private readonly aiService: AiService,
  ) {}

  // ─── CRUD nguồn tin ───────────────────────────────────────────────────────

  listSources() {
    return this.sourceRepo.find({ order: { createdAt: 'ASC' } });
  }

  createSource(dto: { name: string; type: SourceType; url?: string; keyword?: string; maxItems?: number }) {
    const src = this.sourceRepo.create({ ...dto, active: true, maxItems: dto.maxItems ?? 2 });
    return this.sourceRepo.save(src);
  }

  async toggleSource(id: string) {
    const src = await this.sourceRepo.findOneOrFail({ where: { id } });
    src.active = !src.active;
    return this.sourceRepo.save(src);
  }

  async deleteSource(id: string) {
    await this.sourceRepo.delete(id);
    return { deleted: true };
  }

  // ─── Scheduler: 6h, 12h, 18h, 22h mỗi ngày ──────────────────────────────

  @Cron('0 6,12,18,22 * * *')
  async runScheduled() {
    this.logger.log('Video Automation: chạy scheduled pipeline...');
    await this.runPipeline(4);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async runPipeline(count = 3): Promise<{ generated: number; runs: VideoAutomationRun[] }> {
    const stories = await this.fetchStories(count);
    const runs: VideoAutomationRun[] = [];

    for (const story of stories) {
      const run = this.runRepo.create({
        status: RunStatus.FETCHING,
        source: story.source,
        storyTitle: story.title,
        storyContent: story.content,
      });
      await this.runRepo.save(run);

      const audioPath = path.join(os.tmpdir(), `va_voice_${run.id}.wav`);
      const videoPath = path.join(os.tmpdir(), `va_video_${run.id}.mp4`);
      const start = Date.now();

      try {
        // 1. AI: kịch bản, tiêu đề, mô tả, hashtag
        run.status = RunStatus.SCRIPTING;
        await this.runRepo.save(run);
        const script = await this.generateScript(story);
        run.script       = script.script;
        run.videoTitle   = script.title;
        run.description  = script.description;
        run.hashtags     = script.hashtags;

        // 2. TTS: giọng đọc
        run.status = RunStatus.VOICING;
        await this.runRepo.save(run);
        const hasVoice = await this.generateVoice(script.script, audioPath);
        if (hasVoice) run.voiceFile = audioPath;

        // 3. FFmpeg: ghép video
        run.status = RunStatus.RENDERING;
        await this.runRepo.save(run);
        await this.renderVideo(story, script, hasVoice ? audioPath : '', videoPath);
        run.videoFile = videoPath;

        // 4. Upload: YouTube, Facebook Reels, TikTok queue
        run.status = RunStatus.UPLOADING;
        await this.runRepo.save(run);
        const videoUrl = await this.uploadToMinio(videoPath);
        if (videoUrl) run.storageUrl = videoUrl;
        const [yt, fb, tk] = await Promise.allSettled([
          this.uploadYouTube(videoUrl, script),
          this.uploadFacebookReels(videoUrl, script),
          this.saveTikTokQueue(videoPath),
        ]);
        if (yt.status === 'fulfilled') run.youtubeUrl   = yt.value ?? null;
        if (fb.status === 'fulfilled') run.facebookUrl  = fb.value ?? null;
        if (tk.status === 'fulfilled') run.tiktokFile   = tk.value ?? null;

        run.status     = RunStatus.DONE;
        run.durationMs = Date.now() - start;
        await this.runRepo.save(run);
        runs.push(run);
      } catch (e: any) {
        this.logger.error(`Pipeline lỗi [${story.title.slice(0, 40)}]: ${e.message}`);
        run.status       = RunStatus.FAILED;
        run.errorMessage = e.message;
        run.durationMs   = Date.now() - start;
        await this.runRepo.save(run);
      } finally {
        for (const f of [audioPath, videoPath]) {
          try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    return { generated: runs.length, runs };
  }

  async listRuns(limit = 20): Promise<VideoAutomationRun[]> {
    return this.runRepo.find({ order: { createdAt: 'DESC' }, take: limit });
  }

  // Ghép runs cũ không có storageUrl với file MinIO theo timestamp gần nhất
  async backfillStorageUrls(): Promise<{ fixed: number; skipped: number }> {
    const host      = process.env.MINIO_HOST || '127.0.0.1';
    const port      = parseInt(process.env.MINIO_PORT || '9000');
    const accessKey = process.env.MINIO_ROOT_USER || 'minioadmin';
    const secretKey = process.env.MINIO_ROOT_PASSWORD || '';
    const bucket    = process.env.MINIO_BUCKET_VIDEOS || 'videos';
    const publicHost = (process.env.WEB_URL || `http://${host}`).replace(/\/$/, '');
    const webPort   = process.env.NGINX_PORT || '8080';
    const prefix    = 'video-automation/';

    // Lấy danh sách file trong MinIO
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Minio = require('minio');
    const client = new Minio.Client({ endPoint: host, port, useSSL: false, accessKey, secretKey });

    const minioFiles: { name: string; ts: number }[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = client.listObjects(bucket, prefix, false);
      stream.on('data', (obj: any) => {
        const match = obj.name?.match(/video_(\d+)\.mp4$/);
        if (match) minioFiles.push({ name: obj.name, ts: parseInt(match[1]) });
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    if (minioFiles.length === 0) return { fixed: 0, skipped: 0 };
    minioFiles.sort((a, b) => a.ts - b.ts);

    // Runs chưa có storageUrl, đã done
    const runs = await this.runRepo.find({
      where: { status: RunStatus.DONE },
      order: { createdAt: 'ASC' },
    });
    const needsFix = runs.filter(r => !r.storageUrl);

    let fixed = 0;
    const usedTs = new Set<number>();

    for (const run of needsFix) {
      const runTs = new Date(run.createdAt).getTime();
      // Tìm file MinIO gần nhất về thời gian (trong vòng 5 phút)
      let best: { name: string; ts: number } | null = null;
      let bestDiff = Infinity;
      for (const f of minioFiles) {
        if (usedTs.has(f.ts)) continue;
        const diff = Math.abs(f.ts - runTs);
        if (diff < bestDiff && diff < 5 * 60 * 1000) {
          bestDiff = diff;
          best = f;
        }
      }
      if (!best) continue;
      usedTs.add(best.ts);
      run.storageUrl = `${publicHost}:${webPort}/storage/${best.name}`;
      await this.runRepo.save(run);
      fixed++;
      this.logger.log(`Backfill: run ${run.id.slice(0, 8)} → ${best.name}`);
    }

    return { fixed, skipped: needsFix.length - fixed };
  }

  async getRun(id: string): Promise<VideoAutomationRun> {
    return this.runRepo.findOneOrFail({ where: { id } });
  }

  // Stream video từ MinIO qua HTTP response — hỗ trợ Range requests để seek được
  async streamVideo(storageUrl: string, req: any, res: any): Promise<void> {
    // Dùng MinIO SDK trực tiếp (localhost:9000) — không qua nginx công khai
    const host      = process.env.MINIO_HOST || '127.0.0.1';
    const port      = parseInt(process.env.MINIO_PORT || '9000');
    const accessKey = process.env.MINIO_ROOT_USER || 'minioadmin';
    const secretKey = process.env.MINIO_ROOT_PASSWORD || '';
    const bucket    = process.env.MINIO_BUCKET_VIDEOS || 'videos';

    // Trích objectName từ storageUrl
    // VD: http://14.236.113.160:8080/storage/video-automation/video_XXX.mp4
    //       → video-automation/video_XXX.mp4
    const storagePart = storageUrl.split('/storage/')[1];
    if (!storagePart) throw new Error('storageUrl không hợp lệ');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Minio = require('minio');
    const client = new Minio.Client({ endPoint: host, port, useSSL: false, accessKey, secretKey });

    const stat = await client.statObject(bucket, storagePart);
    const fileSize: number = stat.size;
    const rangeHeader: string | undefined = req.headers['range'];

    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end   = endStr ? parseInt(endStr, 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunkSize,
        'Content-Type':   'video/mp4',
      });
      const stream = await client.getPartialObject(bucket, storagePart, start, chunkSize);
      stream.pipe(res);
    } else {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Accept-Ranges', 'bytes');
      const stream = await client.getObject(bucket, storagePart);
      stream.pipe(res);
    }
  }

  async getStats() {
    const [total, done, failed] = await Promise.all([
      this.runRepo.count(),
      this.runRepo.count({ where: { status: RunStatus.DONE } }),
      this.runRepo.count({ where: { status: RunStatus.FAILED } }),
    ]);
    return { total, done, failed, successRate: total ? Math.round((done / total) * 100) : 0 };
  }

  // ─── 1. Lấy nội dung từ TẤT CẢ nguồn — chạy SONG SONG ──────────────────

  private async fetchStories(count: number): Promise<StoryItem[]> {
    // Lấy nguồn từ env (mặc định) + nguồn admin cấu hình, chạy song song
    const tasks: Promise<StoryItem[]>[] = [];

    // --- Nguồn từ env (RSS_FEED_URLS) ---
    const envRssUrls = (process.env.RSS_FEED_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const url of envRssUrls.slice(0, 5)) {
      tasks.push(this.fetchRss(url, 3));
    }

    // --- Tiki (luôn chạy song song) ---
    tasks.push(this.fetchTiki(count));

    // --- Nguồn admin cấu hình (DB) ---
    const adminSources = await this.sourceRepo.find({ where: { active: true } }).catch(() => []);
    for (const src of adminSources) {
      if (src.type === SourceType.RSS && src.url) {
        tasks.push(this.fetchRss(src.url, src.maxItems));
      } else if (src.type === SourceType.TIKI) {
        tasks.push(this.fetchTiki(src.maxItems, src.keyword));
      } else if (src.type === SourceType.SHOPEE) {
        tasks.push(this.fetchShopee(src.maxItems, src.keyword));
      } else if (src.type === SourceType.WEBSITE && src.url) {
        tasks.push(this.fetchRss(src.url, src.maxItems)); // thử parse như RSS
      }
    }

    // Chạy TẤT CẢ song song
    const results = await Promise.allSettled(tasks);
    const merged: StoryItem[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') merged.push(...r.value);
    }

    // Loại trùng title, shuffle, lấy đủ count
    const seen = new Set<string>();
    const unique = merged.filter(i => {
      const key = i.title.slice(0, 40).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Shuffle để đa dạng nguồn
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    this.logger.log(`Fetch song song: ${tasks.length} nguồn → ${unique.length} tin → lấy ${Math.min(unique.length, count)}`);
    return unique.slice(0, count);
  }

  // ─── Fetch từ RSS feed ────────────────────────────────────────────────────

  private async fetchRss(url: string, max = 3): Promise<StoryItem[]> {
    try {
      const res = await axios.get(url, { timeout: 8000 });
      const entries = (res.data as string).match(/<item[^>]*>([\s\S]*?)<\/item>/g) || [];
      const items: StoryItem[] = [];
      for (const e of entries.slice(0, max * 2)) {
        const title = (e.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || '').trim();
        const link  = (e.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1] || '').trim();
        const desc  = ((e.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description[^>]*>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<[^>]*>/g, '').slice(0, 300)).trim();
        const img   = e.match(/<enclosure[^>]*url="([^"]+)"/)?.[1] || e.match(/<media:thumbnail[^>]*url="([^"]+)"/)?.[1] || '';
        if (title) items.push({ title, content: desc, image: img, link, source: RunSource.RSS });
        if (items.length >= max) break;
      }
      return items;
    } catch (e: any) {
      this.logger.warn(`RSS lỗi [${url.slice(0, 50)}]: ${e.message}`);
      return [];
    }
  }

  // ─── Fetch từ Tiki ────────────────────────────────────────────────────────

  private async fetchTiki(max = 3, keyword?: string): Promise<StoryItem[]> {
    try {
      const TIKI_CATS = [1789, 8322, 1520, 1883, 8371];
      const catId = TIKI_CATS[Math.floor(Math.random() * TIKI_CATS.length)];
      const params: any = { limit: max + 3, sort: 'top_seller', page: 1 };
      if (keyword) { params.q = keyword; } else { params.category = catId; }

      const res = await axios.get('https://tiki.vn/api/v2/products', {
        params,
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)', 'Referer': 'https://tiki.vn', Accept: 'application/json' },
        timeout: 10000,
      });
      const items: StoryItem[] = [];
      for (const p of (res.data?.data || [])) {
        if (items.length >= max) break;
        if (!p.url_key || !p.price) continue;
        const pf = new Intl.NumberFormat('vi-VN').format(p.price) + 'đ';
        items.push({
          title: p.name || '',
          content: `Sản phẩm bán chạy${keyword ? ` "${keyword}"` : ''} trên Tiki, giá ${pf}`,
          image: p.thumbnail_url || '',
          link: `https://tiki.vn/${p.url_key}.html`,
          source: RunSource.WEBSITE,
        });
      }
      return items;
    } catch (e: any) {
      this.logger.warn(`Tiki lỗi: ${e.message}`);
      return [];
    }
  }

  // ─── Fetch từ Shopee ──────────────────────────────────────────────────────

  private async fetchShopee(max = 3, keyword?: string): Promise<StoryItem[]> {
    try {
      const res = await axios.get('https://shopee.vn/api/v4/search/search_items', {
        params: { by: 'sales', keyword: keyword || 'bán chạy', limit: max + 3, newest: 0, order: 'desc', page_type: 'search', version: 2 },
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://shopee.vn/' },
        timeout: 8000,
      });
      const items: StoryItem[] = [];
      for (const item of (res.data?.items || [])) {
        if (items.length >= max) break;
        const p = item.item_basic || item;
        if (!p?.name) continue;
        const price = Math.round(Number(p.price || 0) / 100000);
        items.push({
          title: p.name,
          content: `Sản phẩm${keyword ? ` "${keyword}"` : ''} hot trên Shopee, giá ${price.toLocaleString('vi-VN')}đ`,
          image: p.image ? `https://down-vn.img.susercontent.com/file/${p.image}` : '',
          link: `https://shopee.vn/${(p.name as string).replace(/\s+/g, '-')}-i.${p.shopid}.${p.itemid}`,
          source: RunSource.SHOPEE,
        });
      }
      return items;
    } catch (e: any) {
      this.logger.warn(`Shopee lỗi: ${e.message}`);
      return [];
    }
  }

  // ─── 2. Ollama AI: kịch bản, tiêu đề, mô tả, hashtag ────────────────────

  private async generateScript(story: StoryItem): Promise<VideoScript> {
    const prompt = `Chủ đề: "${story.title}"
Nội dung: ${story.content}
Link: ${story.link}

Trả về JSON hợp lệ:
{
  "title": "tiêu đề video hấp dẫn tối đa 100 ký tự",
  "script": "kịch bản lời thoại 60-80 giây, văn nói tự nhiên tiếng Việt",
  "description": "mô tả video 150-200 ký tự kèm link",
  "hashtags": ["hashtag1","hashtag2","hashtag3","hashtag4","hashtag5"]
}`;
    try {
      const result = await this.aiService.parseJson<VideoScript>(
        prompt,
        'Bạn là content creator video ngắn chuyên nghiệp. Chỉ trả về JSON hợp lệ.',
      );
      if (result.title && result.script) return result;
    } catch (e: any) {
      this.logger.warn(`AI script lỗi: ${e.message}`);
    }
    return {
      title: story.title.slice(0, 100),
      script: `Xin chào! ${story.title}. ${story.content.slice(0, 150)}. Link trong bio nhé!`,
      description: `${story.content.slice(0, 150)} 👉 ${story.link}`,
      hashtags: ['#muasam', '#deal', '#viral', '#review', '#tiktok'],
    };
  }

  // ─── 3. Piper TTS: giọng đọc ─────────────────────────────────────────────

  private async generateVoice(text: string, outPath: string): Promise<boolean> {
    const piperDir   = process.env.PIPER_DIR || '/home/hqdu/piper';
    const modelName  = process.env.PIPER_MODEL || 'vi_VN-vais1000-medium';
    const piperBin   = path.join(piperDir, 'piper');
    const modelPath  = path.join(piperDir, 'models', `${modelName}.onnx`);

    if (!fs.existsSync(piperBin) || !fs.existsSync(modelPath)) {
      this.logger.warn(`Piper không tìm thấy tại ${piperDir} — bỏ qua TTS`);
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const proc = spawn(piperBin, ['--model', modelPath, '--output-file', outPath, '--quiet'], {
        env: { ...process.env, LD_LIBRARY_PATH: piperDir },
      });
      proc.stdin.write(text, 'utf8');
      proc.stdin.end();
      proc.on('close', code => {
        const ok = code === 0 && fs.existsSync(outPath);
        this.logger.log(ok ? `TTS OK: ${path.basename(outPath)}` : `TTS exit ${code}`);
        resolve(ok);
      });
      proc.on('error', e => { this.logger.warn(`TTS lỗi: ${e.message}`); resolve(false); });
    });
  }

  // ─── 4. FFmpeg: ghép video nền + giọng đọc ───────────────────────────────

  private async renderVideo(story: StoryItem, script: VideoScript, audioPath: string, outPath: string): Promise<void> {
    // Chọn video nền ngẫu nhiên từ ~/video-source nếu có
    const videoSrcDir = process.env.VIDEO_SOURCE_DIR || path.join(os.homedir(), 'video-source');
    const bgVideos = fs.existsSync(videoSrcDir)
      ? fs.readdirSync(videoSrcDir).filter(f => f.endsWith('.mp4'))
      : [];
    const bgVideo = bgVideos.length
      ? path.join(videoSrcDir, bgVideos[Math.floor(Math.random() * bgVideos.length)])
      : null;

    if (bgVideo && audioPath && fs.existsSync(audioPath)) {
      await this.ffmpegVideoAudio(bgVideo, audioPath, script, outPath);
    } else if (bgVideo) {
      await this.ffmpegVideoOnly(bgVideo, script, outPath);
    } else {
      await this.ffmpegImageFallback(story, script, audioPath, outPath);
    }
  }

  private ffmpegVideoAudio(bgVideo: string, audioPath: string, script: VideoScript, outPath: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpegPath = require('ffmpeg-static');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(bgVideo)
        .input(audioPath)
        .videoFilters([
          'scale=1080:1920:force_original_aspect_ratio=increase',
          'crop=1080:1920',
          'format=yuv420p',
        ])
        .outputOptions(['-c:v libx264', '-preset fast', '-crf 23', '-c:a aac', '-b:a 128k', '-shortest', '-movflags +faststart'])
        .output(outPath)
        .on('end', () => { this.logger.log(`FFmpeg (video+audio) OK`); resolve(); })
        .on('error', reject)
        .run();
    });
  }

  private ffmpegVideoOnly(bgVideo: string, script: VideoScript, outPath: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpegPath = require('ffmpeg-static');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(bgVideo)
        .videoFilters(['scale=1080:1920:force_original_aspect_ratio=increase', 'crop=1080:1920', 'format=yuv420p'])
        .outputOptions(['-c:v libx264', '-preset fast', '-crf 23', '-t 60', '-movflags +faststart'])
        .output(outPath)
        .on('end', () => { this.logger.log(`FFmpeg (video only) OK`); resolve(); })
        .on('error', reject)
        .run();
    });
  }

  private async ffmpegImageFallback(story: StoryItem, script: VideoScript, audioPath: string, outPath: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require('sharp');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpegPath = require('ffmpeg-static');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);

    const imgPath = path.join(os.tmpdir(), `va_bg_${Date.now()}.jpg`);
    try {
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const t1  = esc(script.title.slice(0, 50));
      const t2  = esc(script.title.slice(50, 90));
      const tags = (script.hashtags || []).slice(0, 4).map(h => esc(h.replace(/^#/, ''))).join(' #');

      const svg = `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#0a0a1a"/>
            <stop offset="100%" style="stop-color:#1a1a3e"/>
          </linearGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#bg)"/>
        <circle cx="1080" cy="350" r="420" fill="#0066FF" fill-opacity="0.1"/>
        <circle cx="0" cy="1550" r="380" fill="#0066FF" fill-opacity="0.08"/>
        <rect x="60" y="700" width="960" height="250" rx="24" fill="rgba(0,102,255,0.8)"/>
        <text x="540" y="815" font-family="Arial,sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">${t1}</text>
        <text x="540" y="875" font-family="Arial,sans-serif" font-size="36" fill="rgba(255,255,255,0.9)" text-anchor="middle">${t2}</text>
        <rect x="180" y="1050" width="720" height="90" rx="45" fill="white"/>
        <text x="540" y="1106" font-family="Arial,sans-serif" font-size="32" font-weight="bold" fill="#0066FF" text-anchor="middle">👉 Link trong bio để mua ngay!</text>
        <text x="540" y="1250" font-family="Arial,sans-serif" font-size="28" fill="rgba(255,255,255,0.45)" text-anchor="middle">#${tags}</text>
        <text x="540" y="1840" font-family="Arial,sans-serif" font-size="24" fill="rgba(255,255,255,0.3)" text-anchor="middle">🔔 Follow để nhận nội dung mỗi ngày!</text>
      </svg>`;

      // Thêm ảnh sản phẩm nếu có
      const base = sharp(Buffer.from(svg));
      if (story.image) {
        try {
          const imgRes = await axios.get(story.image, { responseType: 'arraybuffer', timeout: 8000 });
          const productBuf = await sharp(Buffer.from(imgRes.data as ArrayBuffer))
            .resize(860, 600, { fit: 'contain', background: { r: 15, g: 15, b: 30, alpha: 1 } })
            .jpeg({ quality: 90 })
            .toBuffer();
          await base.composite([{ input: productBuf, top: 60, left: 110 }]).jpeg({ quality: 90 }).toFile(imgPath);
        } catch {
          await base.jpeg({ quality: 90 }).toFile(imgPath);
        }
      } else {
        await base.jpeg({ quality: 90 }).toFile(imgPath);
      }

      await new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg().input(imgPath).inputOptions(['-loop 1']);
        const hasAudio = audioPath && fs.existsSync(audioPath);
        if (hasAudio) cmd.input(audioPath);

        cmd.videoFilters([
          'scale=1080:1920:force_original_aspect_ratio=increase',
          'crop=1080:1920',
          'zoompan=z=\'min(zoom+0.0006,1.08)\':d=9000:x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':s=1080x1920',
          'format=yuv420p',
        ]);

        const opts = ['-c:v libx264', '-preset fast', '-crf 23', '-movflags +faststart'];
        if (hasAudio) opts.push('-c:a aac', '-b:a 128k', '-shortest');
        else opts.push('-t 60', '-r 30');

        cmd.outputOptions(opts)
          .output(outPath)
          .on('end', () => { this.logger.log('FFmpeg (image fallback) OK'); resolve(); })
          .on('error', reject)
          .run();
      });
    } finally {
      try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); } catch {}
    }
  }

  // ─── 5. MinIO upload ──────────────────────────────────────────────────────

  private async uploadToMinio(videoPath: string): Promise<string | null> {
    const host       = process.env.MINIO_HOST || '127.0.0.1';
    const port       = parseInt(process.env.MINIO_PORT || '9000');
    const accessKey  = process.env.MINIO_ROOT_USER || 'minioadmin';
    const secretKey  = process.env.MINIO_ROOT_PASSWORD || '';
    const bucket     = process.env.MINIO_BUCKET_VIDEOS || 'videos';
    const publicHost = (process.env.WEB_URL || `http://${host}`).replace(/\/$/, '');
    const webPort    = process.env.NGINX_PORT || '8080';

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Minio = require('minio');
      const client = new Minio.Client({ endPoint: host, port, useSSL: false, accessKey, secretKey });

      const exists = await client.bucketExists(bucket).catch(() => false);
      if (!exists) {
        await client.makeBucket(bucket, 'us-east-1');
        await client.setBucketPolicy(bucket, JSON.stringify({
          Version: '2012-10-17',
          Statement: [{ Effect: 'Allow', Principal: { AWS: ['*'] }, Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${bucket}/*`] }],
        }));
      }

      const objectName = `video-automation/video_${Date.now()}.mp4`;
      await client.fPutObject(bucket, objectName, videoPath, { 'Content-Type': 'video/mp4' });
      const url = `${publicHost}:${webPort}/storage/${objectName}`;
      this.logger.log(`MinIO OK: ${objectName}`);
      return url;
    } catch (e: any) {
      this.logger.warn(`MinIO lỗi: ${e.message}`);
      return null;
    }
  }

  // ─── 6. YouTube upload qua Make.com webhook ───────────────────────────────

  private async uploadYouTube(videoUrl: string | null, script: VideoScript): Promise<string | undefined> {
    const webhookUrl = process.env.MAKE_YOUTUBE_WEBHOOK;
    if (!webhookUrl || !videoUrl) return undefined;
    await axios.post(webhookUrl, {
      video_url: videoUrl,
      title: script.title.slice(0, 100),
      description: `${script.description}\n\n${(script.hashtags || []).join(' ')}`.slice(0, 5000),
      tags: (script.hashtags || []).map(h => h.replace(/^#/, '')),
      category_id: '22',
      privacy: 'public',
      language: 'vi',
    }, { timeout: 30000 });
    this.logger.log(`YouTube webhook OK: ${script.title.slice(0, 40)}`);
    return 'queued_youtube';
  }

  // ─── 7. Facebook Reels qua Make.com webhook ───────────────────────────────

  private async uploadFacebookReels(videoUrl: string | null, script: VideoScript): Promise<string | undefined> {
    const webhookUrl = process.env.MAKE_REELS_WEBHOOK;
    if (!webhookUrl || !videoUrl) return undefined;
    const tags = (script.hashtags || []).join(' ');
    await axios.post(webhookUrl, {
      video_url: videoUrl,
      title: script.title.slice(0, 100),
      message: `${script.title}\n\n${script.description}\n\n${tags}`.slice(0, 2200),
      type: 'reel',
    }, { timeout: 30000 });
    this.logger.log('Facebook Reels webhook OK');
    return 'queued_reels';
  }

  // ─── 8. TikTok queue ──────────────────────────────────────────────────────

  private async saveTikTokQueue(videoPath: string): Promise<string | undefined> {
    const tiktokDir = path.join(os.tmpdir(), 'tiktok_videos');
    if (!fs.existsSync(tiktokDir)) fs.mkdirSync(tiktokDir, { recursive: true });
    const dest = path.join(tiktokDir, `va_${Date.now()}.mp4`);
    fs.copyFileSync(videoPath, dest);
    this.logger.log(`TikTok queue: ${path.basename(dest)}`);
    return dest;
  }

  // ─── 9. Google Sheets log ─────────────────────────────────────────────────

  async logToSheets(run: VideoAutomationRun): Promise<void> {
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    const saJson  = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!sheetId || !saJson) return;
    try {
      const sa    = JSON.parse(saJson);
      const token = await this.getServiceAccountToken(sa, 'https://www.googleapis.com/auth/spreadsheets');
      const now   = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const row   = [now, run.source, run.storyTitle?.slice(0, 100), run.videoTitle?.slice(0, 100), run.youtubeUrl || '', run.facebookUrl ? 'OK' : '', run.tiktokFile ? 'Queued' : '', (run.hashtags || []).join(', ')];
      await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append`,
        { values: [row], majorDimension: 'ROWS' },
        { params: { valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS' }, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: 10000 },
      );
      this.logger.log('Google Sheets log OK');
    } catch (e: any) {
      this.logger.debug(`Google Sheets lỗi: ${e.message}`);
    }
  }

  private async getServiceAccountToken(sa: any, scope: string): Promise<string> {
    const now    = Math.floor(Date.now() / 1000);
    const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })).toString('base64url');
    const sign    = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const sig = sign.sign(sa.private_key, 'base64url');
    const res = await axios.post('https://oauth2.googleapis.com/token', { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${payload}.${sig}` }, { timeout: 10000 });
    return res.data.access_token;
  }
}
