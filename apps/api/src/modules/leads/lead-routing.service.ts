import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../../database/entities/lead.entity';
import { User, UserRole, UserStatus } from '../../database/entities/user.entity';
import { Customer } from '../../database/entities/customer.entity';

@Injectable()
export class LeadRoutingService {
  private readonly logger = new Logger(LeadRoutingService.name);
  private roundRobinIndex = 0;

  constructor(
    @InjectRepository(Lead)     private readonly leadRepo: Repository<Lead>,
    @InjectRepository(User)     private readonly userRepo: Repository<User>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
  ) {}

  // ─── F03.1: Sales Assignment (round-robin) ────────────────────────────────

  async assignLead(leadId: string, agentId?: string): Promise<Lead> {
    const lead = await this.leadRepo.findOneByOrFail({ id: leadId });

    let assignee = agentId;

    if (!assignee) {
      assignee = await this.pickNextAgent();
    }

    await this.leadRepo.update(lead.id, {
      assignedTo: assignee ?? undefined,
      status: assignee ? LeadStatus.CONTACTED : lead.status,
    });

    this.logger.log(`Lead ${lead.id} assigned to ${assignee ?? 'unassigned'}`);
    return this.leadRepo.findOneByOrFail({ id: leadId });
  }

  private async pickNextAgent(): Promise<string | null> {
    const agents = await this.userRepo.find({
      where: { role: UserRole.STAFF, status: UserStatus.ACTIVE },
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });

    if (!agents.length) return null;

    const agent = agents[this.roundRobinIndex % agents.length];
    this.roundRobinIndex++;
    return agent.id;
  }

  // ─── Auto-route high-score unassigned leads ────────────────────────────────

  async autoRoute(minScore = 60): Promise<{ routed: number }> {
    const unassigned = await this.leadRepo
      .createQueryBuilder('l')
      .where('l.status = :s', { s: LeadStatus.NEW })
      .andWhere('l.score >= :score', { score: minScore })
      .andWhere('l.assignedTo IS NULL')
      .orderBy('l.score', 'DESC')
      .take(50)
      .getMany();

    let routed = 0;
    for (const lead of unassigned) {
      try {
        await this.assignLead(lead.id);
        routed++;
      } catch { /* skip */ }
    }

    return { routed };
  }

  // ─── F03.2: CRM Sync (Lead → Customer) ────────────────────────────────────

  async syncToCustomer(leadId: string): Promise<{ customerId: string; created: boolean }> {
    const lead = await this.leadRepo.findOneByOrFail({ id: leadId });

    if (lead.customerId) {
      return { customerId: lead.customerId, created: false };
    }

    const phone: string | undefined = lead.meta?.phone;
    const email: string | undefined = lead.meta?.email;

    // Try to find existing customer by phone or email
    let customer: Customer | null = null;

    if (phone) {
      customer = await this.customerRepo.findOne({ where: { phone } });
    }
    if (!customer && email) {
      customer = await this.customerRepo.findOne({ where: { email } });
    }

    let created = false;
    if (!customer) {
      customer = await this.customerRepo.save(
        this.customerRepo.create({
          name: lead.name ?? 'Khách hàng mới',
          phone: phone ?? undefined,
          email: email ?? undefined,
          note: `Nguồn: ${lead.platform}`,
        }),
      );
      created = true;
    }

    await this.leadRepo.update(lead.id, {
      customerId: customer.id,
      status: LeadStatus.QUALIFIED,
    });

    return { customerId: customer.id, created };
  }

  // ─── Batch sync converted leads to CRM ────────────────────────────────────

  async batchSyncToCrm(): Promise<{ synced: number }> {
    const leads = await this.leadRepo
      .createQueryBuilder('l')
      .where('l.customerId IS NULL')
      .andWhere('l.status IN (:...statuses)', {
        statuses: [LeadStatus.QUALIFIED, LeadStatus.CONVERTED],
      })
      .take(50)
      .getMany();

    let synced = 0;
    for (const lead of leads) {
      try {
        await this.syncToCustomer(lead.id);
        synced++;
      } catch { /* skip */ }
    }

    return { synced };
  }

  // ─── Assignment stats ─────────────────────────────────────────────────────

  async getRoutingStats() {
    const [total, unassigned, byAgent] = await Promise.all([
      this.leadRepo.count({ where: { status: LeadStatus.NEW } }),
      this.leadRepo.count({ where: { status: LeadStatus.NEW, assignedTo: null as any } }),
      this.leadRepo
        .createQueryBuilder('l')
        .select('l.assignedTo', 'agentId')
        .addSelect('COUNT(*)', 'count')
        .where('l.assignedTo IS NOT NULL')
        .groupBy('l.assignedTo')
        .getRawMany(),
    ]);

    const agentIds = byAgent.map((r) => r.agentId).filter(Boolean);
    const agents = agentIds.length
      ? await this.userRepo.findByIds(agentIds)
      : [];
    const agentMap = new Map(agents.map((a) => [a.id, a.name]));

    return {
      openLeads: total,
      unassigned,
      assignedByAgent: byAgent.map((r) => ({
        agentId: r.agentId,
        agentName: agentMap.get(r.agentId) ?? r.agentId,
        count: parseInt(r.count),
      })),
    };
  }
}
