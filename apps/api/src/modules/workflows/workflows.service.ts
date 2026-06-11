import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow, WorkflowStatus, WorkflowTrigger } from '../../database/entities/workflow.entity';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly repo: Repository<Workflow>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findActive() {
    return this.repo.find({ where: { status: WorkflowStatus.ACTIVE }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Workflow không tồn tại');
    return item;
  }

  create(data: Partial<Workflow>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Workflow>) {
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async activate(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: WorkflowStatus.ACTIVE });
    return this.findOne(id);
  }

  async deactivate(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: WorkflowStatus.INACTIVE });
    return this.findOne(id);
  }

  async recordRun(id: string, success: boolean) {
    const wf = await this.findOne(id);
    await this.repo.update(id, {
      runCount: wf.runCount + 1,
      successCount: success ? wf.successCount + 1 : wf.successCount,
      failCount: !success ? wf.failCount + 1 : wf.failCount,
      lastRunAt: new Date(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
    return { deleted: true };
  }

  async getStats(): Promise<Record<string, any>> {
    const [total, active, byTrigger] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: WorkflowStatus.ACTIVE } }),
      this.repo.createQueryBuilder('w')
        .select('w.trigger', 'trigger')
        .addSelect('COUNT(*)', 'count')
        .groupBy('w.trigger')
        .getRawMany(),
    ]);

    return { total, active, byTrigger };
  }
}
