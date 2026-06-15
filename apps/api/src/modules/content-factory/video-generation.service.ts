import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { ProductsService } from '../products/products.service';
import { Content, ContentPlatform, ContentStatus } from '../../database/entities/content.entity';

export interface VideoScript {
  title: string;
  hook: string;        // 3-second opening hook
  scenes: SceneBlock[];
  cta: string;
  totalDurationSec: number;
  voiceOverText: string;
}

export interface SceneBlock {
  second: number;
  visual: string;
  voiceOver: string;
  text: string;
}

export enum VideoJob_Status {
  PENDING    = 'pending',
  SCRIPTING  = 'scripting',
  VOICEOVER  = 'voiceover',
  RENDERING  = 'rendering',
  DONE       = 'done',
  FAILED     = 'failed',
}

export interface VideoJob {
  id: string;
  productId: string;
  style: 'tiktok_60s' | 'reels_30s' | 'youtube_short';
  status: VideoJob_Status;
  script?: VideoScript;
  voiceOverUrl?: string;
  videoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

@Injectable()
export class VideoGenerationService {
  private readonly logger = new Logger(VideoGenerationService.name);

  // In-memory job registry (replace with DB queue in production)
  private readonly jobs = new Map<string, VideoJob>();

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
  ) {}

  // ─── F02: Script Generation ───────────────────────────────────────────────

  async generateScript(
    productId: string,
    style: VideoJob['style'] = 'tiktok_60s',
  ): Promise<VideoJob> {
    const product = await this.productsService.findOne(productId);

    const jobId = `vj_${Date.now()}_${productId.slice(-6)}`;
    const job: VideoJob = {
      id: jobId,
      productId,
      style,
      status: VideoJob_Status.SCRIPTING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(jobId, job);

    const durationSec = style === 'youtube_short' ? 60 : style === 'reels_30s' ? 30 : 60;
    const sceneCount  = Math.floor(durationSec / 10);

    const prompt = `Viết kịch bản video ${style} ${durationSec}s cho sản phẩm: "${product.name}", giá ${product.price?.toLocaleString('vi-VN')}đ.
Trả về JSON hợp lệ:
{
  "title": "tiêu đề video",
  "hook": "câu hook 3 giây đầu cực mạnh",
  "scenes": [
    { "second": 0, "visual": "mô tả hình ảnh", "voiceOver": "lời thoại", "text": "text overlay" }
  ],
  "cta": "call to action cuối",
  "totalDurationSec": ${durationSec},
  "voiceOverText": "toàn bộ lời thoại ghép lại"
}
Tạo ${sceneCount} scenes, mỗi scene ~10 giây.`;

    try {
      const script = await this.aiService.parseJson<VideoScript>(prompt,
        'Bạn là đạo diễn video TikTok chuyên nghiệp Việt Nam. Chỉ trả về JSON hợp lệ.');

      job.script = script;
      job.status = VideoJob_Status.VOICEOVER;
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);

      // Persist script as Content record
      await this.contentRepo.save(
        this.contentRepo.create({
          productId,
          title: script.title,
          body: JSON.stringify(script),
          platform: ContentPlatform.TIKTOK,
          status: ContentStatus.DRAFT,
        }),
      );

      // Trigger voice-over async (non-blocking)
      this.processVoiceOver(jobId, script.voiceOverText).catch(() => {});

      return job;
    } catch (e) {
      job.status = VideoJob_Status.FAILED;
      job.error = e.message;
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);
      throw e;
    }
  }

  // ─── F02: Voice Over ──────────────────────────────────────────────────────

  private async processVoiceOver(jobId: string, text: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // TTS via external service (env: TTS_API_URL). Falls back to stub URL.
      const ttsUrl = process.env.TTS_API_URL;
      if (ttsUrl) {
        const { default: axios } = await import('axios');
        const res = await axios.post(`${ttsUrl}/tts`, {
          text,
          voice: 'vi-VN-Standard-A',
          speed: 1.1,
        }, { timeout: 30000 });
        job.voiceOverUrl = res.data?.audioUrl || res.data?.url;
      } else {
        // Stub: record that voice-over is "ready" without actual audio
        job.voiceOverUrl = `stub://voiceover/${jobId}.mp3`;
      }

      job.status = VideoJob_Status.RENDERING;
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);

      // Trigger render async
      await this.processRendering(jobId);
    } catch (e) {
      this.logger.warn(`VoiceOver failed for ${jobId}: ${e.message}`);
    }
  }

  // ─── F02: Video Rendering ─────────────────────────────────────────────────

  private async processRendering(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.script) return;

    try {
      const renderUrl = process.env.VIDEO_RENDER_URL;
      if (renderUrl) {
        const { default: axios } = await import('axios');
        const res = await axios.post(`${renderUrl}/render`, {
          script: job.script,
          voiceOverUrl: job.voiceOverUrl,
          style: job.style,
        }, { timeout: 120000 });
        job.videoUrl = res.data?.videoUrl || res.data?.url;
      } else {
        job.videoUrl = `stub://video/${jobId}.mp4`;
      }

      job.status = VideoJob_Status.DONE;
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);
      this.logger.log(`Video job ${jobId} done: ${job.videoUrl}`);
    } catch (e) {
      job.status = VideoJob_Status.FAILED;
      job.error = e.message;
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);
      this.logger.error(`Render failed for ${jobId}: ${e.message}`);
    }
  }

  // ─── F02: Job Management ─────────────────────────────────────────────────

  getJob(jobId: string): VideoJob | undefined {
    return this.jobs.get(jobId);
  }

  listJobs(): VideoJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 100);
  }
}
