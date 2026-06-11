import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceVendor, VendorStatus } from '../../../database/entities/marketplace-vendor.entity';
import { MarketplaceDispute, DisputeStatus } from '../../../database/entities/marketplace-dispute.entity';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { AiService } from '../../ai/ai.service';

@Injectable()
export class MarketplaceOptimizerService {
  private readonly logger = new Logger(MarketplaceOptimizerService.name);

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(MarketplaceVendor)
    private readonly vendorRepo: Repository<MarketplaceVendor>,
    @InjectRepository(MarketplaceDispute)
    private readonly disputeRepo: Repository<MarketplaceDispute>,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 */6 * * *')
  async runOptimize() {
    this.logger.log('Agent22 MarketplaceOptimizer: bắt đầu tối ưu marketplace...');
    await this.optimize();
  }

  async optimize() {
    const log = this.logRepo.create({ agent: AgentName.MARKETPLACE_OPTIMIZER, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const vendors = await this.vendorRepo.find({ where: { status: VendorStatus.ACTIVE } });
      const openDisputes = await this.disputeRepo.count({ where: { status: DisputeStatus.OPEN } });

      const totalGmv = vendors.reduce((sum, v) => sum + parseFloat(v.totalGmv as any || '0'), 0);
      const avgDisputeRate = vendors.length > 0
        ? vendors.reduce((sum, v) => sum + parseFloat(v.disputeRate as any || '0'), 0) / vendors.length
        : 0;

      const highDisputeVendors = vendors.filter(v => parseFloat(v.disputeRate as any || '0') > 5);
      const inactiveVendors = vendors.filter(v => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return !v.lastSaleAt || v.lastSaleAt < sevenDaysAgo;
      });

      const suggestions = await this.generateSuggestions({ vendors, highDisputeVendors, avgDisputeRate, totalGmv });

      const output = {
        totalVendors: vendors.length,
        totalGmv,
        avgDisputeRate: avgDisputeRate.toFixed(2),
        openDisputes,
        highDisputeVendorCount: highDisputeVendors.length,
        inactiveVendorCount: inactiveVendors.length,
        alerts: [
          avgDisputeRate > 5 ? `ALERT: Dispute rate trung bình ${avgDisputeRate.toFixed(1)}% > 5%` : null,
          highDisputeVendors.length > 0 ? `${highDisputeVendors.length} vendor cần can thiệp (dispute rate cao)` : null,
        ].filter(Boolean),
        suggestions,
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

  private async generateSuggestions(data: any) {
    const prompt = `Bạn là chuyên gia tối ưu marketplace.

Dữ liệu:
- Tổng vendor: ${data.vendors.length}
- GMV tổng: ${data.totalGmv.toLocaleString()} VND
- Dispute rate trung bình: ${data.avgDisputeRate}%
- Vendor dispute cao: ${data.highDisputeVendors.length} vendor

Đề xuất 3 hành động ưu tiên để tối ưu marketplace.
Trả lời JSON với key: actions (array of {priority, action, expectedImpact})`;

    return this.aiService.generate(prompt);
  }

  async getStats() {
    const totalVendors = await this.vendorRepo.count();
    const activeVendors = await this.vendorRepo.count({ where: { status: VendorStatus.ACTIVE } });
    const openDisputes = await this.disputeRepo.count({ where: { status: DisputeStatus.OPEN } });
    const logs = await this.logRepo.find({
      where: { agent: AgentName.MARKETPLACE_OPTIMIZER },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return { totalVendors, activeVendors, openDisputes, recentRuns: logs };
  }
}
