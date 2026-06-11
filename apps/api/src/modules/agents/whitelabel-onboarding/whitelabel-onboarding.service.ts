import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhiteLabelClient, WhiteLabelStatus } from '../../../database/entities/white-label-client.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class WhitelabelOnboardingService {
  private readonly logger = new Logger(WhitelabelOnboardingService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(WhiteLabelClient)
    private readonly clientRepo: Repository<WhiteLabelClient>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  // Chạy mỗi 4h để theo dõi tiến độ onboarding
  @Cron('0 */4 * * *')
  async runOnboardingCheck() {
    this.logger.log('Agent25 WhitelabelOnboarding: kiểm tra tiến độ onboarding...');
    await this.checkOnboarding();
  }

  async checkOnboarding() {
    const log = this.logRepo.create({ agent: AgentName.WHITELABEL_ONBOARDING, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const onboardingClients = await this.clientRepo.find({ where: { status: WhiteLabelStatus.ONBOARDING } });
      const activeClients = await this.clientRepo.find({ where: { status: WhiteLabelStatus.ACTIVE } });

      const stalled: any[] = [];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const client of onboardingClients) {
        if (client.onboardingStartedAt && client.onboardingStartedAt < sevenDaysAgo) {
          const daysSinceStart = Math.floor(
            (Date.now() - client.onboardingStartedAt.getTime()) / (1000 * 60 * 60 * 24),
          );
          stalled.push({ id: client.id, name: client.companyName, daysSinceStart });
        }
      }

      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const inactiveRisk = activeClients.filter(c => !c.lastActiveAt || c.lastActiveAt < fourteenDaysAgo);

      const totalBacklog = onboardingClients.reduce((s, c) => s + (c.customizationBacklog || 0), 0);

      const action = stalled.length > 0 || inactiveRisk.length > 0
        ? await this.generateOnboardingActions({ stalled, inactiveRisk, totalBacklog })
        : null;

      const output = {
        totalOnboarding: onboardingClients.length,
        totalActive: activeClients.length,
        stalledOnboarding: stalled.length,
        stalledClients: stalled,
        inactiveRiskCount: inactiveRisk.length,
        inactiveRiskClients: inactiveRisk.map(c => ({ id: c.id, name: c.companyName, lastActiveAt: c.lastActiveAt })),
        customizationBacklog: totalBacklog,
        backlogAlert: totalBacklog > 10,
        actions: action,
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

  private async generateOnboardingActions(data: any) {
    const prompt = `Bạn là White Label Success Manager.

Tình trạng:
- Onboarding bị đình trệ: ${data.stalled.length} client
- Inactive risk: ${data.inactiveRisk.length} client
- Customization backlog: ${data.totalBacklog} requests

Đề xuất hành động cụ thể để unblock onboarding và giảm churn.
Trả lời JSON với key: actions (array of {priority, clientName, issue, action, deadline})`;

    return this.aiService.generate(prompt);
  }

  async getStats() {
    const total = await this.clientRepo.count();
    const onboarding = await this.clientRepo.count({ where: { status: WhiteLabelStatus.ONBOARDING } });
    const active = await this.clientRepo.count({ where: { status: WhiteLabelStatus.ACTIVE } });
    const logs = await this.logRepo.find({
      where: { agent: AgentName.WHITELABEL_ONBOARDING },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return { totalClients: total, onboarding, active, recentRuns: logs };
  }
}
