import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MobileSession, MobilePlatform } from '../../database/entities/mobile-session.entity';

@Injectable()
export class MobileService {
  constructor(
    @InjectRepository(MobileSession)
    private readonly sessionRepo: Repository<MobileSession>,
  ) {}

  async trackSession(dto: Partial<MobileSession>) {
    const session = this.sessionRepo.create(dto);
    return this.sessionRepo.save(session);
  }

  async endSession(id: string, durationSeconds: number, screenViews: number, crashed = false) {
    await this.sessionRepo.update(id, {
      durationSeconds,
      screenViews,
      crashed,
      endedAt: new Date(),
    });
    return this.sessionRepo.findOne({ where: { id } });
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dau = await this.sessionRepo
      .createQueryBuilder('s')
      .select('COUNT(DISTINCT s.userId)', 'count')
      .where('s.createdAt >= :today', { today })
      .getRawOne();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const wau = await this.sessionRepo
      .createQueryBuilder('s')
      .select('COUNT(DISTINCT s.userId)', 'count')
      .where('s.createdAt >= :d', { d: sevenDaysAgo })
      .getRawOne();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const mau = await this.sessionRepo
      .createQueryBuilder('s')
      .select('COUNT(DISTINCT s.userId)', 'count')
      .where('s.createdAt >= :d', { d: thirtyDaysAgo })
      .getRawOne();

    const crashRate = await this.sessionRepo
      .createQueryBuilder('s')
      .select('COUNT(*) FILTER (WHERE s.crashed = true)', 'crashed')
      .addSelect('COUNT(*)', 'total')
      .where('s.createdAt >= :d', { d: sevenDaysAgo })
      .getRawOne();

    const avgSession = await this.sessionRepo
      .createQueryBuilder('s')
      .select('AVG(s.durationSeconds)', 'avg')
      .where('s.createdAt >= :d', { d: sevenDaysAgo })
      .andWhere('s.durationSeconds > 0')
      .getRawOne();

    const byPlatform = await this.sessionRepo
      .createQueryBuilder('s')
      .select('s.platform', 'platform')
      .addSelect('COUNT(*)', 'count')
      .where('s.createdAt >= :d', { d: sevenDaysAgo })
      .groupBy('s.platform')
      .getRawMany();

    const crashedTotal = parseInt(crashRate?.crashed || '0');
    const total = parseInt(crashRate?.total || '1');
    const crashPercent = total > 0 ? ((crashedTotal / total) * 100).toFixed(2) : '0';

    return {
      dau: parseInt(dau?.count || '0'),
      wau: parseInt(wau?.count || '0'),
      mau: parseInt(mau?.count || '0'),
      crashRatePercent: parseFloat(crashPercent),
      crashAlert: parseFloat(crashPercent) > 1,
      avgSessionSeconds: parseFloat(avgSession?.avg || '0').toFixed(0),
      byPlatform,
    };
  }

  async getRetention() {
    // D1, D7, D30 retention based on users who came back
    const cohortStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const cohortEnd = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);

    const cohort = await this.sessionRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.userId', 'userId')
      .where('s.createdAt >= :start AND s.createdAt < :end', { start: cohortStart, end: cohortEnd })
      .getRawMany();

    const cohortSize = cohort.length;
    if (cohortSize === 0) return { d1: 0, d7: 0, d30: 0, cohortSize: 0 };

    const userIds = cohort.map(r => r.userId).filter(Boolean);

    const d1Start = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    const d1End = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const d7Start = new Date(Date.now() - 23 * 24 * 60 * 60 * 1000);
    const d7End = new Date(Date.now() - 22 * 24 * 60 * 60 * 1000);
    const d30Now = new Date();

    const buildRetentionQuery = (start: Date, end: Date) =>
      this.sessionRepo
        .createQueryBuilder('s')
        .select('COUNT(DISTINCT s.userId)', 'count')
        .where('s.userId IN (:...ids)', { ids: userIds.length > 0 ? userIds : [''] })
        .andWhere('s.createdAt >= :start AND s.createdAt < :end', { start, end });

    const [d1, d7, d30] = await Promise.all([
      buildRetentionQuery(d1Start, d1End).getRawOne(),
      buildRetentionQuery(d7Start, d7End).getRawOne(),
      buildRetentionQuery(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), d30Now).getRawOne(),
    ]);

    return {
      cohortSize,
      d1Retention: ((parseInt(d1?.count || '0') / cohortSize) * 100).toFixed(1),
      d7Retention: ((parseInt(d7?.count || '0') / cohortSize) * 100).toFixed(1),
      d30Retention: ((parseInt(d30?.count || '0') / cohortSize) * 100).toFixed(1),
    };
  }
}
