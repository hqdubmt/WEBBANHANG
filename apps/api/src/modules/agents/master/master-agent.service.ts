import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';

export interface AgentTask {
  task: string;
  agent: AgentName;
  priority: 'high' | 'medium' | 'low';
}

interface AgentPerformance {
  agent: AgentName;
  successRate: number;
  avgDurationMs: number;
  lastRunAt: Date | null;
}

@Injectable()
export class MasterAgentService {
  private readonly logger = new Logger(MasterAgentService.name);

  constructor(
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 * * * *')
  async runHourlyOrchestration() {
    this.logger.log('Master Agent: đánh giá KPI và phân công tác vụ...');
    const tasks = await this.evaluateAndAssign();
    this.logger.log(`Master Agent: đã tạo ${tasks.length} tác vụ`);
  }

  async evaluateAndAssign(): Promise<AgentTask[]> {
    const log = this.logRepo.create({ agent: AgentName.MASTER, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const performance = await this.getAgentPerformance();
      const tasks = this.generateTasks(performance);

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { tasks, performance } as any,
        durationMs: Date.now() - startMs,
      });

      return tasks;
    } catch (e) {
      this.logger.error('Master Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return [];
    }
  }

  private async getAgentPerformance(): Promise<AgentPerformance[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const agents = Object.values(AgentName);
    const performances: AgentPerformance[] = [];

    for (const agent of agents) {
      const logs = await this.logRepo.find({
        where: { agent, status: AgentRunStatus.SUCCESS },
        order: { createdAt: 'DESC' },
        take: 10,
      });

      const allLogs = await this.logRepo.find({ where: { agent } });
      const recentLogs = allLogs.filter((l) => l.createdAt >= since);
      const successCount = recentLogs.filter((l) => l.status === AgentRunStatus.SUCCESS).length;
      const successRate = recentLogs.length ? (successCount / recentLogs.length) * 100 : 0;
      const avgDuration = logs.length
        ? logs.reduce((sum, l) => sum + l.durationMs, 0) / logs.length
        : 0;

      performances.push({
        agent,
        successRate,
        avgDurationMs: avgDuration,
        lastRunAt: logs[0]?.createdAt ?? null,
      });
    }

    return performances;
  }

  private generateTasks(performance: AgentPerformance[]): AgentTask[] {
    const tasks: AgentTask[] = [];
    const now = new Date();

    const needsRun = (p: AgentPerformance, intervalHours: number) =>
      !p.lastRunAt || (now.getTime() - p.lastRunAt.getTime()) > intervalHours * 60 * 60 * 1000;

    for (const p of performance) {
      switch (p.agent) {
        case AgentName.TREND:
        case AgentName.TREND_PREDICTOR:
          if (needsRun(p, 6)) {
            tasks.push({ task: 'scan_trends', agent: p.agent, priority: 'high' });
          }
          break;
        case AgentName.CONTENT:
          if (needsRun(p, 8)) {
            tasks.push({ task: 'create_content', agent: p.agent, priority: 'medium' });
          }
          break;
        case AgentName.SEO:
          if (needsRun(p, 12)) {
            tasks.push({ task: 'generate_seo_articles', agent: p.agent, priority: 'medium' });
          }
          break;
        case AgentName.PRICE:
          if (needsRun(p, 1)) {
            tasks.push({ task: 'check_prices', agent: p.agent, priority: 'high' });
          }
          break;
        case AgentName.VIDEO:
          if (needsRun(p, 24)) {
            tasks.push({ task: 'create_videos', agent: p.agent, priority: 'low' });
          }
          break;
        case AgentName.EMAIL:
          if (needsRun(p, 24)) {
            tasks.push({ task: 'send_campaigns', agent: p.agent, priority: 'medium' });
          }
          break;
        case AgentName.SEGMENTATION:
          if (needsRun(p, 12)) {
            tasks.push({ task: 'segment_customers', agent: p.agent, priority: 'low' });
          }
          break;
      }
    }

    return tasks.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  }

  async getSystemKpi(): Promise<Record<string, any>> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const allLogs = await this.logRepo.find({ order: { createdAt: 'DESC' }, take: 500 });
    const recent = allLogs.filter((l) => l.createdAt >= since24h);

    return {
      totalRuns24h: recent.length,
      successRate: recent.length
        ? Math.round((recent.filter((l) => l.status === AgentRunStatus.SUCCESS).length / recent.length) * 100)
        : 0,
      activeAgents: [...new Set(recent.map((l) => l.agent))].length,
      avgDurationMs: recent.length
        ? Math.round(recent.reduce((s, l) => s + l.durationMs, 0) / recent.length)
        : 0,
    };
  }
}
