import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../../database/entities/tenant.entity';

@Injectable()
export class EnterpriseService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  findAll() {
    return this.tenantRepo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return this.tenantRepo.findOne({ where: { id } });
  }

  create(dto: Partial<Tenant>) {
    const tenant = this.tenantRepo.create(dto);
    return this.tenantRepo.save(tenant);
  }

  update(id: string, dto: Partial<Tenant>) {
    return this.tenantRepo.update(id, dto);
  }

  remove(id: string) {
    return this.tenantRepo.delete(id);
  }

  async getStats() {
    const total = await this.tenantRepo.count();
    const active = await this.tenantRepo.count({ where: { status: TenantStatus.ACTIVE } });
    const trial = await this.tenantRepo.count({ where: { status: TenantStatus.TRIAL } });
    const churned = await this.tenantRepo.count({ where: { status: TenantStatus.CHURNED } });

    // Tenants at churn risk: active but no login in 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const churnRisk = await this.tenantRepo
      .createQueryBuilder('t')
      .where('t.status = :s', { s: TenantStatus.ACTIVE })
      .andWhere('(t.lastLoginAt IS NULL OR t.lastLoginAt < :d)', { d: thirtyDaysAgo })
      .getMany();

    const slaViolations = await this.tenantRepo
      .createQueryBuilder('t')
      .where('t.uptimePercent < t.slaTarget')
      .getMany();

    const revenue = await this.tenantRepo
      .createQueryBuilder('t')
      .select('SUM(t.monthlyRevenue)', 'total')
      .getRawOne();

    return {
      total,
      active,
      trial,
      churned,
      churnRiskCount: churnRisk.length,
      churnRiskTenants: churnRisk.map(t => ({ id: t.id, name: t.name, lastLoginAt: t.lastLoginAt })),
      slaViolationCount: slaViolations.length,
      slaViolations: slaViolations.map(t => ({ id: t.id, name: t.name, uptime: t.uptimePercent, target: t.slaTarget })),
      totalMonthlyRevenue: parseFloat(revenue?.total || '0'),
    };
  }

  async updateUptime(id: string, uptimePercent: number) {
    await this.tenantRepo.update(id, { uptimePercent });
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (tenant && uptimePercent < tenant.slaTarget) {
      return { id, alert: true, message: `SLA violation: uptime ${uptimePercent}% < target ${tenant.slaTarget}%` };
    }
    return { id, alert: false, uptimePercent };
  }
}
