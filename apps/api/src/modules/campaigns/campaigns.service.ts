import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus } from '../../database/entities/campaign.entity';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly repo: Repository<Campaign>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Chiến dịch không tồn tại');
    return item;
  }

  create(data: Partial<Campaign>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Campaign>) {
    await this.findOne(id);
    if (data.scheduledAt !== undefined && data.scheduledAt !== null) {
      const d = data.scheduledAt instanceof Date ? data.scheduledAt : new Date(data.scheduledAt as any);
      if (isNaN(d.getTime())) delete data.scheduledAt;
      else data.scheduledAt = d;
    }
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async launch(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: CampaignStatus.RUNNING, startedAt: new Date() });
    return this.findOne(id);
  }

  async complete(id: string, stats: { sentCount?: number; openCount?: number; clickCount?: number; conversionCount?: number }) {
    await this.findOne(id);
    await this.repo.update(id, { ...stats, status: CampaignStatus.COMPLETED, completedAt: new Date() });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: CampaignStatus.CANCELLED });
    return { deleted: true };
  }

  async getStats(): Promise<Record<string, any>> {
    const [total, running, completed] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: CampaignStatus.RUNNING } }),
      this.repo.count({ where: { status: CampaignStatus.COMPLETED } }),
    ]);

    const agg = await this.repo
      .createQueryBuilder('c')
      .select('SUM(c.sentCount)', 'totalSent')
      .addSelect('SUM(c.conversionCount)', 'totalConversions')
      .where('c.status = :status', { status: CampaignStatus.COMPLETED })
      .getRawOne();

    return {
      total, running, completed,
      totalSent: Number(agg?.totalSent || 0),
      totalConversions: Number(agg?.totalConversions || 0),
    };
  }
}
