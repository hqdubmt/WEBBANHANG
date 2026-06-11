import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MobileSession } from '../../../database/entities/mobile-session.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class MobileEngagementService {
  private readonly logger = new Logger(MobileEngagementService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(MobileSession)
    private readonly sessionRepo: Repository<MobileSession>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 */12 * * *')
  async runAnalysis() {
    this.logger.log('Agent23 MobileEngagement: phân tích engagement...');
    await this.analyze();
  }

  async analyze() {
    const log = this.logRepo.create({ agent: AgentName.MOBILE_ENGAGEMENT, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const stats = await this.sessionRepo
        .createQueryBuilder('s')
        .select('COUNT(*)', 'totalSessions')
        .addSelect('COUNT(*) FILTER (WHERE s.crashed = true)', 'crashes')
        .addSelect('AVG(s.durationSeconds)', 'avgDuration')
        .addSelect('COUNT(DISTINCT s.userId)', 'uniqueUsers')
        .where('s.createdAt >= :d', { d: sevenDaysAgo })
        .getRawOne();

      const total = parseInt(stats?.totalSessions || '1');
      const crashes = parseInt(stats?.crashes || '0');
      const crashRate = ((crashes / Math.max(total, 1)) * 100).toFixed(2);

      const alerts: string[] = [];
      if (parseFloat(crashRate) > 1) alerts.push(`CRITICAL: Crash rate ${crashRate}% > 1% — cần hotfix ngay`);
      if (parseInt(stats?.uniqueUsers || '0') < 100) alerts.push('WARNING: DAU thấp — review onboarding flow');

      const pushSuggestions = await this.generatePushNotificationStrategy({
        uniqueUsers: stats?.uniqueUsers,
        avgDuration: stats?.avgDuration,
        crashRate,
      });

      const output = {
        period: '7 ngày gần nhất',
        totalSessions: total,
        uniqueUsers: parseInt(stats?.uniqueUsers || '0'),
        crashRate: parseFloat(crashRate),
        avgSessionSeconds: parseFloat(stats?.avgDuration || '0').toFixed(0),
        alerts,
        pushNotificationStrategy: pushSuggestions,
      };

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: output as any,
        durationMs: Date.now() - startMs,
      });

      return output;
    } catch (err: any) {
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: err.message,
        durationMs: Date.now() - startMs,
      });
      throw err;
    }
  }

  private async generatePushNotificationStrategy(data: any) {
    const prompt = `Bạn là chuyên gia mobile marketing.

Metrics 7 ngày:
- Người dùng unique: ${data.uniqueUsers}
- Thời gian session trung bình: ${data.avgDuration}s
- Crash rate: ${data.crashRate}%

Đề xuất chiến lược push notification để tăng retention.
Trả lời JSON với key: notifications (array of {type, timing, message, segment, expectedRetentionLift})`;

    return this.aiService.generate(prompt);
  }

  async getStats() {
    const totalSessions = await this.sessionRepo.count();
    const logs = await this.logRepo.find({
      where: { agent: AgentName.MOBILE_ENGAGEMENT },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return { totalSessions, recentRuns: logs };
  }
}
