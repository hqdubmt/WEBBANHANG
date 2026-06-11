import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentLog, AgentName, AgentRunStatus } from '../../../database/entities/agent-log.entity';
import { AiService } from '../../ai/ai.service';
import { ProductsService } from '../../products/products.service';
import { OrdersService } from '../../orders/orders.service';

@Injectable()
export class DemandForecasterService {
  private readonly logger = new Logger(DemandForecasterService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    @InjectRepository(AgentLog)
    private readonly logRepo: Repository<AgentLog>,
  ) {}

  // Dự báo nhu cầu mỗi 12h
  @Cron('0 */12 * * *')
  async runForecast() {
    this.logger.log('Agent19 DemandForecaster: dự báo nhu cầu...');
    await this.forecast();
  }

  async forecast() {
    const log = this.logRepo.create({ agent: AgentName.DEMAND_FORECASTER, status: AgentRunStatus.RUNNING });
    await this.logRepo.save(log);
    const startMs = Date.now();

    try {
      const products = await this.productsService.getHotProducts(20);
      const revenueData = await this.ordersService.getRevenueSummary(30);
      const forecasts: any[] = [];

      for (const product of products.slice(0, 10)) {
        const forecast = await this.forecastProduct(product, revenueData);
        if (forecast) forecasts.push(forecast);
      }

      await this.logRepo.update(log.id, {
        status: AgentRunStatus.SUCCESS,
        output: { forecasted: forecasts.length, data: forecasts } as any,
        durationMs: Date.now() - startMs,
      });

      return { forecasted: forecasts.length, forecasts };
    } catch (err: any) {
      await this.logRepo.update(log.id, {
        status: AgentRunStatus.FAILED,
        errorMessage: err.message,
        durationMs: Date.now() - startMs,
      });
      throw err;
    }
  }

  private async forecastProduct(product: any, revenueData: any) {
    const prompt = `Bạn là chuyên gia dự báo nhu cầu (demand forecasting).
Sản phẩm: ${product.name}
Tồn kho hiện tại: ${product.stock}
Trend score: ${product.trendScore || 0}
Dữ liệu doanh thu 30 ngày: ${JSON.stringify(revenueData).slice(0, 200)}

Dự báo:
1. Nhu cầu dự kiến 7 ngày tới (số lượng)
2. Nhu cầu dự kiến 30 ngày tới (số lượng)
3. Cần nhập thêm không? Bao nhiêu?
4. Mức độ tự tin (1-10)

Trả lời JSON: { forecast7d, forecast30d, reorderQty, confidence, reason }`;

    try {
      const raw = await this.aiService.generate(prompt);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        return { productId: product.id, productName: product.name, currentStock: product.stock, ...JSON.parse(match[0]) };
      }
    } catch {}
    return null;
  }

  async getStats() {
    const logs = await this.logRepo.find({
      where: { agent: AgentName.DEMAND_FORECASTER },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return { recentRuns: logs };
  }
}
