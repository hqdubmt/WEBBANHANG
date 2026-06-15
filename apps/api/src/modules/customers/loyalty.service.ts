import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, CustomerTier } from '../../database/entities/customer.entity';
import { Coupon, CouponType, CouponStatus } from '../../database/entities/coupon.entity';

const TIER_THRESHOLDS = {
  [CustomerTier.REGULAR]: 1_000_000,   // 1M VND total spent
  [CustomerTier.VIP]:     10_000_000,  // 10M VND total spent
};

const POINTS_PER_VND = 0.001;         // 1 point per 1,000 VND spent
const POINT_VALUE    = 100;           // 1 point = 100 VND discount

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Coupon)   private readonly couponRepo: Repository<Coupon>,
  ) {}

  // ─── F03: VIP Tier Management ────────────────────────────────────────────

  async checkAndUpgradeTier(customerId: string): Promise<{
    customer: Customer;
    upgraded: boolean;
    previousTier: CustomerTier;
    newTier: CustomerTier;
  }> {
    const customer = await this.customerRepo.findOneByOrFail({ id: customerId });
    const previousTier = customer.tier;
    let newTier = customer.tier;

    if (customer.totalSpent >= TIER_THRESHOLDS[CustomerTier.VIP]) {
      newTier = CustomerTier.VIP;
    } else if (customer.totalSpent >= TIER_THRESHOLDS[CustomerTier.REGULAR]) {
      newTier = CustomerTier.REGULAR;
    }

    const upgraded = newTier !== previousTier;
    if (upgraded) {
      await this.customerRepo.update(customerId, { tier: newTier });
      this.logger.log(`Customer ${customer.name} upgraded: ${previousTier} → ${newTier}`);

      if (newTier === CustomerTier.VIP) {
        await this.awardWelcomeVipCoupon(customer);
      }
    }

    return {
      customer: { ...customer, tier: newTier },
      upgraded,
      previousTier,
      newTier,
    };
  }

  async batchCheckTiers(): Promise<{ upgraded: number }> {
    const customers = await this.customerRepo.find({ take: 200 });
    let upgraded = 0;

    for (const c of customers) {
      const result = await this.checkAndUpgradeTier(c.id);
      if (result.upgraded) upgraded++;
    }

    return { upgraded };
  }

  // ─── F03: Rewards — points → coupons ─────────────────────────────────────

  calculatePoints(spentAmount: number): number {
    return Math.floor(spentAmount * POINTS_PER_VND);
  }

  calculatePointValue(points: number): number {
    return points * POINT_VALUE;
  }

  async awardRewardCoupon(
    customerId: string,
    points: number,
  ): Promise<Coupon> {
    const discountAmount = this.calculatePointValue(points);
    const customer = await this.customerRepo.findOneByOrFail({ id: customerId });

    const code = `REWARD-${customer.name.slice(0, 4).toUpperCase().replace(/\s/g, '')}-${Date.now().toString(36).toUpperCase().slice(-4)}`;

    const coupon = await this.couponRepo.save(
      this.couponRepo.create({
        code,
        description: `Thưởng điểm tích lũy — ${points.toLocaleString('vi-VN')} điểm`,
        type:         CouponType.FIXED,
        value:        discountAmount,
        minOrderAmount: discountAmount * 2,
        usageLimit:   1,
        perUserLimit: 1,
        status:       CouponStatus.ACTIVE,
        expiresAt:    new Date(Date.now() + 30 * 86400000),
        applicableSegmentId: customerId,
      }),
    );

    this.logger.log(`Reward coupon ${code} (${discountAmount.toLocaleString('vi-VN')}đ) awarded to ${customer.name}`);
    return coupon;
  }

  private async awardWelcomeVipCoupon(customer: Customer): Promise<void> {
    const code = `VIP-WELCOME-${customer.id.slice(-6).toUpperCase()}`;
    await this.couponRepo.save(
      this.couponRepo.create({
        code,
        description: `Chào mừng VIP — ${customer.name}`,
        type:         CouponType.PERCENT,
        value:        10,
        minOrderAmount: 500_000,
        maxDiscountAmount: 200_000,
        usageLimit:   3,
        perUserLimit: 3,
        status:       CouponStatus.ACTIVE,
        expiresAt:    new Date(Date.now() + 90 * 86400000),
        applicableSegmentId: customer.id,
      }),
    );
  }

  // ─── F03: VIP Perks lookup ────────────────────────────────────────────────

  getVipPerks(tier: CustomerTier): Record<string, any> {
    const perks: Record<CustomerTier, any> = {
      [CustomerTier.NEW]: {
        discountPercent: 0,
        freeShipping: false,
        prioritySupport: false,
        monthlyRewardPoints: 0,
        description: 'Khách hàng mới — tích lũy để nâng cấp',
      },
      [CustomerTier.REGULAR]: {
        discountPercent: 5,
        freeShipping: false,
        prioritySupport: false,
        monthlyRewardPoints: 100,
        description: 'Giảm 5% mọi đơn hàng + tích điểm thưởng',
      },
      [CustomerTier.VIP]: {
        discountPercent: 10,
        freeShipping: true,
        prioritySupport: true,
        monthlyRewardPoints: 500,
        dedicatedAgent: true,
        description: 'Giảm 10% + miễn phí ship + hỗ trợ ưu tiên',
      },
    };
    return perks[tier];
  }

  async getCustomerLoyaltySummary(customerId: string) {
    const customer = await this.customerRepo.findOneByOrFail({ id: customerId });
    const points = this.calculatePoints(customer.totalSpent);
    const nextTier = customer.tier === CustomerTier.NEW
      ? CustomerTier.REGULAR
      : customer.tier === CustomerTier.REGULAR
        ? CustomerTier.VIP
        : null;

    const spentToNextTier = nextTier
      ? Math.max(0, TIER_THRESHOLDS[nextTier] - customer.totalSpent)
      : 0;

    const coupons = await this.couponRepo
      .createQueryBuilder('c')
      .where('c.applicableSegmentId = :id', { id: customerId })
      .andWhere('c.status = :s', { s: CouponStatus.ACTIVE })
      .getMany();

    return {
      customerId,
      customerName: customer.name,
      currentTier: customer.tier,
      perks: this.getVipPerks(customer.tier),
      points,
      pointValue: this.calculatePointValue(points),
      nextTier,
      spentToNextTier,
      activeCoupons: coupons.length,
      coupons,
    };
  }
}
