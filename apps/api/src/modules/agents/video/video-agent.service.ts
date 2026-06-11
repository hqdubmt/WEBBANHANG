import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';
import { VideoJob, VideoPlatform, VideoStatus } from '../../../database/entities/video-job.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';

@Injectable()
export class VideoAgentService {
  private readonly logger = new Logger(VideoAgentService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    @InjectRepository(VideoJob)
    private readonly videoRepo: Repository<VideoJob>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 10 * * *')
  async runDailyVideoCreation() {
    this.logger.log('Video Agent: bắt đầu tạo video...');
    await this.createDailyVideos();
  }

  async createDailyVideos(count = 5): Promise<VideoJob[]> {
    const log = this.logRepo.create({ agent: AgentName.VIDEO, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const products = await this.productsService.getHotProducts(count);
      const jobs: VideoJob[] = [];

      for (const product of products) {
        const platforms = [VideoPlatform.TIKTOK, VideoPlatform.FACEBOOK_REELS];
        for (const platform of platforms) {
          const job = await this.createVideoJob(product, platform);
          jobs.push(job);
        }
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { created: jobs.length } as any,
        durationMs: Date.now() - startMs,
      });

      return jobs;
    } catch (e) {
      this.logger.error('Video Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  async createVideoJob(product: any, platform: VideoPlatform): Promise<VideoJob> {
    const job = this.videoRepo.create({
      productId: product.id,
      platform,
      status: VideoStatus.GENERATING_SCRIPT,
    });
    await this.videoRepo.save(job);

    try {
      const script = await this.generateScript(product, platform);
      await this.videoRepo.update(job.id, { script, status: VideoStatus.GENERATING_VOICE });

      const voiceUrl = await this.generateVoice(script, job.id);
      await this.videoRepo.update(job.id, { voiceUrl, status: VideoStatus.RENDERING });

      await this.videoRepo.update(job.id, { status: VideoStatus.UPLOADING });
      this.logger.log(`Video job ${job.id} sẵn sàng upload (${platform})`);

      await this.videoRepo.update(job.id, { status: VideoStatus.PUBLISHED });
    } catch (e) {
      await this.videoRepo.update(job.id, {
        status: VideoStatus.FAILED,
        errorMessage: e.message,
      });
      this.logger.error(`Video job ${job.id} thất bại:`, e.message);
    }

    return this.videoRepo.findOne({ where: { id: job.id } });
  }

  private async generateScript(product: any, platform: VideoPlatform): Promise<string> {
    const platformGuide: Record<VideoPlatform, string> = {
      [VideoPlatform.TIKTOK]: 'TikTok 60 giây, hook mạnh 3 giây đầu, CTA cuối',
      [VideoPlatform.FACEBOOK_REELS]: 'Facebook Reels 30-60 giây, thân thiện, có emoji',
      [VideoPlatform.YOUTUBE_SHORTS]: 'YouTube Shorts 60 giây, informative, thêm value',
    };

    const systemPrompt = `Bạn là scriptwriter chuyên video bán hàng ngắn.
Viết kịch bản ${platformGuide[platform]}.
Gồm: [HOOK] [THÂN BÀI] [CTA]. Văn nói tự nhiên tiếng Việt.`;

    const prompt = `Sản phẩm: ${product.name}
Giá: ${product.price?.toLocaleString('vi-VN')}đ
Link: ${product.affiliateLink || '#'}
Mô tả: ${product.description || ''}

Viết kịch bản video:`;

    try {
      const res = await this.aiService.chat([{ role: 'user', content: prompt }], systemPrompt);
      return res.content;
    } catch {
      return `[HOOK] Bạn đã biết ${product.name} chưa? [THÂN BÀI] Sản phẩm hot giá ${product.price?.toLocaleString('vi-VN')}đ. [CTA] Đặt ngay: ${product.affiliateLink || '#'}`;
    }
  }

  private async generateVoice(script: string, jobId: string): Promise<string> {
    const ttsProvider = process.env.TTS_PROVIDER || 'openai';

    if (ttsProvider === 'kokoro') {
      return this.generateKokoroVoice(script, jobId);
    }

    if (process.env.OPENAI_API_KEY) {
      return this.generateOpenAiVoice(script, jobId);
    }

    this.logger.warn('Không có TTS provider nào được cấu hình, bỏ qua tạo voice');
    return '';
  }

  private async generateOpenAiVoice(script: string, jobId: string): Promise<string> {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      { model: 'tts-1', input: script, voice: 'nova' },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        responseType: 'arraybuffer',
      },
    );

    const fileName = `voice_${jobId}.mp3`;
    this.logger.log(`OpenAI TTS: tạo ${fileName} (${response.data.byteLength} bytes)`);
    return fileName;
  }

  private async generateKokoroVoice(script: string, jobId: string): Promise<string> {
    const kokoroUrl = process.env.KOKORO_URL || 'http://localhost:8880';
    await axios.post(`${kokoroUrl}/v1/audio/speech`, {
      text: script,
      voice: 'af_bella',
    });
    return `voice_${jobId}.mp3`;
  }

  async getPendingJobs(): Promise<VideoJob[]> {
    return this.videoRepo.find({
      where: { status: VideoStatus.PENDING },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }
}
