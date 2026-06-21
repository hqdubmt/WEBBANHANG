import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceService, AffiliateResult } from '../../marketplace/marketplace.service';
import { ProductsService } from '../../products/products.service';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { ProductStatus, ProductSource } from '../../../database/entities/product.entity';

@Injectable()
export class AffiliateAgentService {
  private readonly logger = new Logger(AffiliateAgentService.name);

  constructor(
    private readonly marketplace: MarketplaceService,
    private readonly productsService: ProductsService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  @Cron('0 8 * * *')
  async runDailyAffiliateDiscovery() {
    this.logger.log('Affiliate Agent: bắt đầu tìm link affiliate...');
    await this.discoverAffiliates();
  }

  async discoverAffiliates(): Promise<{ updated: number; details: any[] }> {
    const log = this.logRepo.create({ agent: AgentName.AFFILIATE, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      // Lấy các sản phẩm chưa có affiliate link
      const pending = await this.productsService.getHotProducts(100);
      const needsLink = pending.filter((p) => !p.affiliateLink);
      this.logger.log(`Affiliate Agent: ${needsLink.length} sản phẩm cần tìm link`);

      const details: Array<{ product: string; platform: string; commission: number; link: string }> = [];

      for (const product of needsLink) {
        const result = await this.findAndApplyBestLink(product);
        if (result) details.push(result);
        // Delay 200ms giữa các request để tránh rate limit
        await new Promise((r) => setTimeout(r, 200));
      }

      // Không tự động thêm sản phẩm mới vào DB

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: {
          processed: needsLink.length,
          updated: details.length,
          platforms: this.marketplace.configuredPlatforms,
          topLinks: details.slice(0, 5),
        } as any,
        durationMs: Date.now() - startMs,
      });

      this.logger.log(`Affiliate Agent xong: cập nhật ${details.length} link affiliate`);
      return { updated: details.length, details };
    } catch (e) {
      this.logger.error('Affiliate Agent lỗi:', e.message);
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: e.message,
        durationMs: Date.now() - startMs,
      });
      return { updated: 0, details: [] };
    }
  }

  private async findAndApplyBestLink(
    product: any,
  ): Promise<{ product: string; platform: string; commission: number; link: string } | null> {
    // Nếu product đã có URL gốc từ marketplace, tạo affiliate link trực tiếp
    if (product.meta?.originalUrl) {
      const result = await this.marketplace.generateAffiliateFromUrl(product.meta.originalUrl);
      if (result) {
        await this.applyAffiliateLink(product.id, result);
        return { product: product.name, platform: result.platform, commission: result.commission, link: result.affiliateLink };
      }
    }

    // Tìm link tốt nhất theo tên sản phẩm, ưu tiên platform gốc
    const preferredPlatform = product.source !== ProductSource.MANUAL
      ? (product.source as any)
      : undefined;

    const result = await this.marketplace.findBestAffiliateLink(product.name, preferredPlatform);
    if (!result) return null;

    await this.applyAffiliateLink(product.id, result);
    return { product: product.name, platform: result.platform, commission: result.commission, link: result.affiliateLink };
  }

  private async applyAffiliateLink(productId: string, result: AffiliateResult): Promise<void> {
    await this.productsService.update(productId, {
      affiliateLink: result.affiliateLink,
      commission: result.commission,
      status: ProductStatus.ACTIVE,
    } as any);
  }

  // Chạy thủ công cho một sản phẩm cụ thể
  async findAffiliateForProduct(
    productId: string,
  ): Promise<{ platform: string; commission: number; link: string } | null> {
    const product = await this.productsService.findOne(productId);
    const result = await this.findAndApplyBestLink(product);
    return result;
  }
}
