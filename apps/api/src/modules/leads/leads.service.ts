import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadPlatform, LeadStatus } from '../../database/entities/lead.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly repo: Repository<Lead>,
  ) {}

  async create(data: Partial<Lead>): Promise<Lead> {
    const lead = this.repo.create(data);
    return this.repo.save(lead);
  }

  async findAll(query: { page?: number; limit?: number; platform?: LeadPlatform; status?: LeadStatus }) {
    const { platform, status } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const where: any = {};
    if (platform) where.platform = platform;
    if (status) where.status = status;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { score: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async updateStatus(id: string, status: LeadStatus, customerId?: string): Promise<Lead> {
    await this.repo.update(id, { status, ...(customerId && { customerId }) });
    return this.repo.findOne({ where: { id } });
  }

  async getTodayLeadCount(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.repo.count({ where: {} });
  }

  async getHighScoreLeads(minScore = 70): Promise<Lead[]> {
    return this.repo
      .createQueryBuilder('l')
      .where('l.score >= :minScore', { minScore })
      .andWhere('l.status = :status', { status: LeadStatus.NEW })
      .orderBy('l.score', 'DESC')
      .getMany();
  }
}
