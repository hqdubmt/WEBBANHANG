import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoJob } from '../../../database/entities/video-job.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class VideoOptimizerService {
  private readonly logger = new Logger(VideoOptimizerService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(VideoJob)
    private readonly videoRepo: Repository<VideoJob>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  // Chạy mỗi 6h, tối ưu metadata video đã publish
  @Cron('0 */6 * * *')
  async runOptimize() {
    this.logger.log('Agent17 VideoOptimizer: bắt đầu tối ưu video...');
    await this.optimizeVideos();
  }

  async optimizeVideos() {
    const log = this.logRepo.create({ agent: AgentName.VIDEO_OPTIMIZER, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const videos = await this.videoRepo
        .createQueryBuilder('v')
        .where('v.status = :s', { s: 'published' })
        .orderBy('RANDOM()')
        .take(10)
        .getMany();

      const optimized: any[] = [];

      for (const video of videos) {
        const suggestion = await this.generateOptimization(video);
        optimized.push({ videoId: video.id, suggestion });
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { optimized: optimized.length, suggestions: optimized } as any,
        durationMs: Date.now() - startMs,
      });

      return { optimized: optimized.length, suggestions: optimized };
    } catch (err: any) {
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: err.message,
        durationMs: Date.now() - startMs,
      });
      throw err;
    }
  }

  private async generateOptimization(video: VideoJob) {
    const prompt = `Bạn là chuyên gia tối ưu video marketing.
Phân tích video sau và đề xuất cải thiện:
- Script: ${(video.script || '').slice(0, 100)}...
- Nền tảng: ${video.platform || 'TikTok/Reels'}

Đề xuất:
1. 3 tiêu đề A/B test tốt hơn
2. 5 hashtag trending phù hợp
3. Thời điểm đăng tốt nhất trong ngày
4. Thumbnail concept

Trả lời JSON với keys: titles, hashtags, bestTime, thumbnailConcept`;

    return this.aiService.generate(prompt);
  }

  async getStats() {
    const total = await this.videoRepo.count();
    const published = await this.videoRepo.count({ where: { status: 'published' } as any });
    const logs = await this.logRepo.find({
      where: { agent: AgentName.VIDEO_OPTIMIZER },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return { totalVideos: total, publishedVideos: published, recentRuns: logs };
  }
}
