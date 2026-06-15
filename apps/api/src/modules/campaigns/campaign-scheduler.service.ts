import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Campaign, CampaignStatus } from '../../database/entities/campaign.entity';

@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly repo: Repository<Campaign>,
  ) {}

  // ─── F01: Planning — schedule a campaign for future execution ────────────

  async scheduleCampaign(
    id: string,
    scheduledAt: Date,
  ): Promise<Campaign> {
    const campaign = await this.repo.findOneByOrFail({ id });
    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.PAUSED) {
      throw new Error(`Campaign status "${campaign.status}" cannot be scheduled`);
    }
    await this.repo.update(id, { status: CampaignStatus.SCHEDULED, scheduledAt });
    return this.repo.findOneByOrFail({ id });
  }

  async pauseCampaign(id: string): Promise<Campaign> {
    await this.repo.update(id, { status: CampaignStatus.PAUSED });
    return this.repo.findOneByOrFail({ id });
  }

  async resumeCampaign(id: string): Promise<Campaign> {
    const campaign = await this.repo.findOneByOrFail({ id });
    if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
      await this.repo.update(id, { status: CampaignStatus.SCHEDULED });
    } else {
      await this.repo.update(id, { status: CampaignStatus.RUNNING, startedAt: new Date() });
    }
    return this.repo.findOneByOrFail({ id });
  }

  // ─── F01: Scheduling — auto-launch due campaigns every minute ────────────

  @Cron('* * * * *')
  async autoLaunchDueCampaigns(): Promise<void> {
    const now = new Date();
    const due = await this.repo.find({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(now),
      },
    });

    if (!due.length) return;

    for (const campaign of due) {
      await this.repo.update(campaign.id, {
        status: CampaignStatus.RUNNING,
        startedAt: new Date(),
      });
      this.logger.log(`Campaign "${campaign.name}" (${campaign.id}) auto-launched`);
    }
  }

  async getScheduledCampaigns(): Promise<Campaign[]> {
    return this.repo.find({
      where: { status: CampaignStatus.SCHEDULED },
      order: { scheduledAt: 'ASC' },
    });
  }
}
