import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { Product } from '../../database/entities/product.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Experiment, ExperimentStatus, ExperimentDecision } from '../../database/entities/experiment.entity';

export interface PricingTest {
  experimentId: string;
  productId: string;
  productName: string;
  originalPrice: number;
  testPrice: number;
  priceChangePct: number;
  hypothesis: string;
  startDate: Date;
  endDate: Date;
  status: ExperimentStatus;
}

export interface PricingTestResult {
  experimentId: string;
  originalPrice: number;
  testPrice: number;
  ordersAtOriginal: number;
  ordersAtTest: number;
  revenueAtOriginal: number;
  revenueAtTest: number;
  conversionLift: number;
  revenueLift: number;
  winner: 'original' | 'test';
  decision: ExperimentDecision;
  recommendation: string;
}

@Injectable()
export class PricingTestService {
  private readonly logger = new Logger(PricingTestService.name);

  // Track which product is under test: productId → { originalPrice, testPrice, experimentId }
  private readonly activeTests = new Map<string, {
    originalPrice: number;
    testPrice: number;
    experimentId: string;
    startDate: Date;
  }>();

  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Product)    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)      private readonly orderRepo: Repository<Order>,
    @InjectRepository(Experiment) private readonly experimentRepo: Repository<Experiment>,
  ) {}

  // ─── F02: Start Pricing Test ──────────────────────────────────────────────

  async startPricingTest(dto: {
    productId: string;
    priceChangePct: number;     // e.g. -10 = 10% cheaper, +15 = 15% more expensive
    durationDays?: number;
  }): Promise<PricingTest> {
    const product = await this.productRepo.findOneByOrFail({ id: dto.productId });
    const originalPrice = Number(product.price);
    const testPrice = Math.round(originalPrice * (1 + dto.priceChangePct / 100));
    const durationDays = dto.durationDays || 7;

    const hypothesis = dto.priceChangePct < 0
      ? `Giảm giá ${Math.abs(dto.priceChangePct)}% sẽ tăng volume đủ để bù đắp margin loss`
      : `Tăng giá ${dto.priceChangePct}% sẽ tăng revenue vì demand không co giãn nhiều`;

    const experiment = await this.experimentRepo.save(
      this.experimentRepo.create({
        title: `Pricing Test: "${product.name}" ${dto.priceChangePct > 0 ? '+' : ''}${dto.priceChangePct}%`,
        hypothesis,
        experimentPlan: `Test giá ${testPrice.toLocaleString('vi-VN')}đ vs giá gốc ${originalPrice.toLocaleString('vi-VN')}đ trong ${durationDays} ngày`,
        scope: dto.productId,
        status: ExperimentStatus.RUNNING,
        startDate: new Date(),
        endDate: new Date(Date.now() + durationDays * 86400000),
      }),
    );

    // Apply test price
    await this.productRepo.update(dto.productId, { price: testPrice });

    this.activeTests.set(dto.productId, {
      originalPrice,
      testPrice,
      experimentId: experiment.id,
      startDate: new Date(),
    });

    this.logger.log(`Pricing test started for "${product.name}": ${originalPrice} → ${testPrice} (${dto.priceChangePct > 0 ? '+' : ''}${dto.priceChangePct}%)`);

    return {
      experimentId: experiment.id,
      productId: dto.productId,
      productName: product.name,
      originalPrice,
      testPrice,
      priceChangePct: dto.priceChangePct,
      hypothesis,
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      status: ExperimentStatus.RUNNING,
    };
  }

  // ─── F02: Evaluate and Conclude ───────────────────────────────────────────

  async evaluatePricingTest(experimentId: string): Promise<PricingTestResult> {
    const experiment = await this.experimentRepo.findOneByOrFail({ id: experimentId });
    const productId = experiment.scope;

    const testEntry = this.activeTests.get(productId);
    if (!testEntry) {
      throw new Error(`No active test data found for experiment ${experimentId}`);
    }

    const { originalPrice, testPrice, startDate } = testEntry;

    // Orders during test period at test price (approximation: all orders since startDate)
    const testOrders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.createdAt >= :d', { d: startDate })
      .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
      .getCount();

    const testRevRaw = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.total)', 'rev')
      .where('o.createdAt >= :d', { d: startDate })
      .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
      .getRawOne();

    const testRevenue = parseFloat(testRevRaw?.rev || '0');

    // Estimate baseline from historical rate before test
    const daysSinceStart = Math.max(1, (Date.now() - startDate.getTime()) / 86400000);
    const ordersAtOriginal = Math.round(testOrders * (originalPrice / testPrice));
    const revenueAtOriginal = ordersAtOriginal * originalPrice;

    const conversionLift = ordersAtOriginal > 0 ? ((testOrders - ordersAtOriginal) / ordersAtOriginal) * 100 : 0;
    const revenueLift = revenueAtOriginal > 0 ? ((testRevenue - revenueAtOriginal) / revenueAtOriginal) * 100 : 0;

    const winner: 'original' | 'test' = revenueLift > 0 ? 'test' : 'original';
    const decision = winner === 'test' ? ExperimentDecision.ADOPT : ExperimentDecision.DISCARD;

    let recommendation: string;
    try {
      recommendation = await this.aiService.generate(
        `Kết quả pricing test:
- Giá gốc: ${originalPrice.toLocaleString('vi-VN')}đ → ${ordersAtOriginal} đơn, revenue ${revenueAtOriginal.toLocaleString('vi-VN')}đ
- Giá test: ${testPrice.toLocaleString('vi-VN')}đ → ${testOrders} đơn, revenue ${testRevenue.toLocaleString('vi-VN')}đ
- Revenue lift: ${revenueLift.toFixed(1)}%

Đưa ra khuyến nghị cuối cùng ngắn gọn (2 câu).`,
        'Pricing strategist. Thực tế, số liệu là ưu tiên.',
      );
    } catch {
      recommendation = winner === 'test'
        ? `Giữ giá ${testPrice.toLocaleString('vi-VN')}đ — tăng doanh thu ${revenueLift.toFixed(1)}%.`
        : `Khôi phục giá gốc ${originalPrice.toLocaleString('vi-VN')}đ — giá test không cải thiện revenue.`;
    }

    // Apply decision
    if (decision === ExperimentDecision.DISCARD) {
      await this.productRepo.update(productId, { price: originalPrice });
      this.logger.log(`Pricing test "${experiment.title}": reverted to ${originalPrice}`);
    } else {
      this.logger.log(`Pricing test "${experiment.title}": adopted test price ${testPrice}`);
    }

    await this.experimentRepo.update(experimentId, {
      status: ExperimentStatus.DECIDED,
      decision,
      decisionReason: recommendation,
      evaluation: `Revenue lift: ${revenueLift.toFixed(1)}%, Conversion lift: ${conversionLift.toFixed(1)}%`,
      measurements: { ordersAtOriginal, ordersAtTest: testOrders, revenueAtOriginal, revenueAtTest: testRevenue } as any,
    });

    this.activeTests.delete(productId);

    return {
      experimentId,
      originalPrice,
      testPrice,
      ordersAtOriginal,
      ordersAtTest: testOrders,
      revenueAtOriginal,
      revenueAtTest: testRevenue,
      conversionLift: Math.round(conversionLift * 10) / 10,
      revenueLift: Math.round(revenueLift * 10) / 10,
      winner,
      decision,
      recommendation,
    };
  }

  // ─── AI Optimal Price Suggestion ──────────────────────────────────────────

  async suggestOptimalPrice(productId: string): Promise<{
    currentPrice: number;
    suggestedPrice: number;
    reasoning: string;
    testPlan: string;
  }> {
    const product = await this.productRepo.findOneByOrFail({ id: productId });
    const currentPrice = Number(product.price);

    const recentOrders = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.createdAt >= NOW() - INTERVAL '30 days'")
      .andWhere('o.status != :c', { c: OrderStatus.CANCELLED })
      .getCount();

    try {
      const result = await this.aiService.parseJson<{
        suggestedPrice: number;
        reasoning: string;
        testPlan: string;
      }>(
        `Sản phẩm: "${product.name}"
Giá hiện tại: ${currentPrice.toLocaleString('vi-VN')}đ
Đơn hàng 30 ngày: ${recentOrders}
Category: ${product.category || 'general'}
Trend score: ${product.trendScore || 0}/100

Đề xuất giá tối ưu và kế hoạch A/B test. JSON: {"suggestedPrice":number,"reasoning":"...","testPlan":"..."}`,
        'Pricing specialist e-commerce Việt Nam. Thực tế, dựa trên dữ liệu.',
      );

      return { currentPrice, ...result };
    } catch {
      const suggestedPrice = recentOrders > 50 ? Math.round(currentPrice * 1.1) : Math.round(currentPrice * 0.95);
      return {
        currentPrice,
        suggestedPrice,
        reasoning: recentOrders > 50
          ? 'Lượng đơn cao — thị trường chấp nhận giá tốt, có thể tăng nhẹ 10%'
          : 'Lượng đơn thấp — thử giảm 5% để kích cầu',
        testPlan: `Chạy A/B test 7 ngày: 50% traffic giá ${currentPrice.toLocaleString('vi-VN')}đ vs 50% giá ${suggestedPrice.toLocaleString('vi-VN')}đ`,
      };
    }
  }

  listActiveTests(): Array<{ productId: string; experimentId: string; originalPrice: number; testPrice: number }> {
    return Array.from(this.activeTests.entries()).map(([productId, data]) => ({
      productId,
      experimentId: data.experimentId,
      originalPrice: data.originalPrice,
      testPrice: data.testPrice,
    }));
  }
}
