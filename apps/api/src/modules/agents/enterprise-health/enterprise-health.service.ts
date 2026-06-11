import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../../../database/entities/tenant.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class EnterpriseHealthService {
  private readonly logger = new Logger(EnterpriseHealthService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 * * * *')
  async runCheck() {
    this.logger.log('Agent24 EnterpriseHealth: kiểm tra sức khỏe tenants...');
    await this.check();
  }

  async check() {
    const log = this.logRepo.create({ agent: AgentName.ENTERPRISE_HEALTH, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const tenants = await this.tenantRepo.find({ where: { status: TenantStatus.ACTIVE } });
      const slaViolations: any[] = [];
      const churnRisks: any[] = [];
      const apiAbuse: any[] = [];

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      for (const tenant of tenants) {
        if (parseFloat(tenant.uptimePercent as any) < tenant.slaTarget) {
          slaViolations.push({
            tenantId: tenant.id,
            name: tenant.name,
            uptime: tenant.uptimePercent,
            target: tenant.slaTarget,
          });
        }
        if (!tenant.lastLoginAt || tenant.lastLoginAt < thirtyDaysAgo) {
          churnRisks.push({ tenantId: tenant.id, name: tenant.name, lastLoginAt: tenant.lastLoginAt });
        }
        if (tenant.apiCallsToday > tenant.apiQuotaDaily * 0.9) {
          apiAbuse.push({
            tenantId: tenant.id,
            name: tenant.name,
            apiCallsToday: tenant.apiCallsToday,
            quota: tenant.apiQuotaDaily,
            usagePercent: ((tenant.apiCallsToday / tenant.apiQuotaDaily) * 100).toFixed(0),
          });
        }
      }

      const totalRevenue = tenants.reduce((s, t) => s + parseFloat(t.monthlyRevenue as any || '0'), 0);

      const recommendations = slaViolations.length > 0 || churnRisks.length > 0
        ? await this.generateRecommendations({ slaViolations, churnRisks, tenantCount: tenants.length })
        : null;

      const output = {
        activeTenants: tenants.length,
        totalMonthlyRevenue: totalRevenue,
        slaViolations,
        churnRisks,
        apiAbuse,
        p0Alerts: slaViolations.length,
        p1Alerts: churnRisks.length + apiAbuse.length,
        recommendations,
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

  private async generateRecommendations(data: any) {
    const prompt = `Bạn là Customer Success Manager cho enterprise SaaS.

Vấn đề hiện tại:
- SLA violations: ${data.slaViolations.length} tenant
- Churn risks: ${data.churnRisks.length} tenant
- Tổng tenants: ${data.tenantCount}

Đề xuất hành động cụ thể để giảm churn và khắc phục SLA.
Trả lời JSON với key: actions (array of {urgency, tenant, action, deadline})`;

    return this.aiService.generate(prompt);
  }

  async getStats() {
    const total = await this.tenantRepo.count();
    const active = await this.tenantRepo.count({ where: { status: TenantStatus.ACTIVE } });
    const logs = await this.logRepo.find({
      where: { agent: AgentName.ENTERPRISE_HEALTH },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return { totalTenants: total, activeTenants: active, recentRuns: logs };
  }
}
