import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhiteLabelClient, WhiteLabelStatus } from '../../database/entities/white-label-client.entity';

@Injectable()
export class WhiteLabelService {
  constructor(
    @InjectRepository(WhiteLabelClient)
    private readonly clientRepo: Repository<WhiteLabelClient>,
  ) {}

  findAll() {
    return this.clientRepo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return this.clientRepo.findOne({ where: { id } });
  }

  async create(dto: Partial<WhiteLabelClient>) {
    const client = this.clientRepo.create({
      ...dto,
      status: WhiteLabelStatus.ONBOARDING,
      onboardingStartedAt: new Date(),
    });
    return this.clientRepo.save(client);
  }

  update(id: string, dto: Partial<WhiteLabelClient>) {
    return this.clientRepo.update(id, dto);
  }

  remove(id: string) {
    return this.clientRepo.delete(id);
  }

  async completeOnboarding(id: string) {
    await this.clientRepo.update(id, {
      status: WhiteLabelStatus.ACTIVE,
      onboardingCompletedAt: new Date(),
    });
    return this.clientRepo.findOne({ where: { id } });
  }

  async getStats() {
    const total = await this.clientRepo.count();
    const active = await this.clientRepo.count({ where: { status: WhiteLabelStatus.ACTIVE } });
    const onboarding = await this.clientRepo.count({ where: { status: WhiteLabelStatus.ONBOARDING } });
    const churned = await this.clientRepo.count({ where: { status: WhiteLabelStatus.CHURNED } });

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const inactiveRisk = await this.clientRepo
      .createQueryBuilder('c')
      .where('c.status = :s', { s: WhiteLabelStatus.ACTIVE })
      .andWhere('(c.lastActiveAt IS NULL OR c.lastActiveAt < :d)', { d: fourteenDaysAgo })
      .getMany();

    const revenue = await this.clientRepo
      .createQueryBuilder('c')
      .select('SUM(c.monthlyFee)', 'mrr')
      .where('c.status = :s', { s: WhiteLabelStatus.ACTIVE })
      .getRawOne();

    const avgOnboardingDays = await this.clientRepo
      .createQueryBuilder('c')
      .select('AVG(EXTRACT(EPOCH FROM (c.onboardingCompletedAt - c.onboardingStartedAt)) / 86400)', 'avgDays')
      .where('c.onboardingCompletedAt IS NOT NULL')
      .getRawOne();

    const backlog = await this.clientRepo
      .createQueryBuilder('c')
      .select('SUM(c.customizationBacklog)', 'total')
      .getRawOne();

    return {
      total,
      active,
      onboarding,
      churned,
      inactiveRiskCount: inactiveRisk.length,
      inactiveRiskClients: inactiveRisk.map(c => ({ id: c.id, name: c.companyName, lastActiveAt: c.lastActiveAt })),
      monthlyRecurringRevenue: parseFloat(revenue?.mrr || '0'),
      avgOnboardingDays: parseFloat(avgOnboardingDays?.avgDays || '0').toFixed(1),
      totalCustomizationBacklog: parseInt(backlog?.total || '0'),
    };
  }
}
