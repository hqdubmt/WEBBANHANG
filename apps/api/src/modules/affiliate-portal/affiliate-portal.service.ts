import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AffiliatePartner, AffiliatePartnerStatus, AffiliatePartnerTier } from '../../database/entities/affiliate-partner.entity';
import { AffiliateClick } from '../../database/entities/affiliate-click.entity';
import { AffiliateConversion, ConversionStatus } from '../../database/entities/affiliate-conversion.entity';
import { Product } from '../../database/entities/product.entity';

@Injectable()
export class AffiliatePortalService {
  constructor(
    @InjectRepository(AffiliatePartner)
    private readonly partnerRepo: Repository<AffiliatePartner>,
    @InjectRepository(AffiliateClick)
    private readonly clickRepo: Repository<AffiliateClick>,
    @InjectRepository(AffiliateConversion)
    private readonly conversionRepo: Repository<AffiliateConversion>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // --- Partners ---

  async listPartners(page = 1, limit = 20, search?: string, status?: AffiliatePartnerStatus) {
    const qb = this.partnerRepo.createQueryBuilder('p');
    if (search) qb.where('p.name ILIKE :s OR p.email ILIKE :s', { s: `%${search}%` });
    if (status) qb.andWhere('p.status = :status', { status });
    qb.orderBy('p.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findPartner(id: string) {
    const item = await this.partnerRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Affiliate partner không tồn tại');
    return item;
  }

  async createPartner(data: Partial<AffiliatePartner>) {
    const existing = await this.partnerRepo.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email đã đăng ký làm affiliate');
    const referralCode = `AF${Date.now().toString(36).toUpperCase()}`;
    return this.partnerRepo.save(this.partnerRepo.create({ ...data, referralCode }));
  }

  async updatePartner(id: string, data: Partial<AffiliatePartner>) {
    await this.findPartner(id);
    await this.partnerRepo.update(id, data);
    return this.findPartner(id);
  }

  async approvePartner(id: string) {
    await this.findPartner(id);
    await this.partnerRepo.update(id, { status: AffiliatePartnerStatus.ACTIVE });
    return this.findPartner(id);
  }

  async suspendPartner(id: string) {
    await this.findPartner(id);
    await this.partnerRepo.update(id, { status: AffiliatePartnerStatus.SUSPENDED });
    return this.findPartner(id);
  }

  async statsPartners() {
    const total = await this.partnerRepo.count();
    const active = await this.partnerRepo.count({ where: { status: AffiliatePartnerStatus.ACTIVE } });
    const pending = await this.partnerRepo.count({ where: { status: AffiliatePartnerStatus.PENDING } });
    const result = await this.partnerRepo
      .createQueryBuilder('p')
      .select('SUM(p.totalEarned)', 'totalCommission')
      .addSelect('SUM(p.pendingPayout)', 'pendingPayout')
      .getRawOne();
    return {
      total, active, pending,
      totalCommission: Number(result?.totalCommission || 0),
      pendingPayout: Number(result?.pendingPayout || 0),
    };
  }

  // --- Clicks & Redirect ---

  async trackClick(data: Partial<AffiliateClick>) {
    const partner = await this.partnerRepo.findOne({ where: { referralCode: data.referralCode } });
    if (partner) {
      await this.partnerRepo.increment({ id: partner.id }, 'totalClicks', 1);
    }
    return this.clickRepo.save(this.clickRepo.create(data));
  }

  async handleClick(
    refCode: string,
    productId: string,
    meta: { ipAddress: string; userAgent: string; referer: string },
  ): Promise<string> {
    const partner = await this.partnerRepo.findOne({ where: { referralCode: refCode, status: AffiliatePartnerStatus.ACTIVE } });

    let destination = 'https://tiki.vn'; // fallback
    let productName = '';

    if (productId) {
      const product = await this.productRepo.findOne({ where: { id: productId } });
      if (product?.affiliateLink) {
        destination = product.affiliateLink;
        productName = product.name;
      }
    }

    if (partner) {
      await this.partnerRepo.increment({ id: partner.id }, 'totalClicks', 1);
      await this.clickRepo.save(this.clickRepo.create({
        partnerId: partner.id,
        referralCode: refCode,
        productId,
        productName,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        referer: meta.referer,
      }));
    }

    return destination;
  }

  // --- Conversions ---

  async listConversions(partnerId?: string, page = 1, limit = 20) {
    const where: any = {};
    if (partnerId) where.partnerId = partnerId;
    const [items, total] = await this.conversionRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page, limit };
  }

  async createConversion(data: Partial<AffiliateConversion>) {
    const partner = await this.partnerRepo.findOne({ where: { referralCode: data.referralCode } });
    const rate = partner?.commissionRate || 5;
    const amount = (Number(data.orderValue || 0) * rate) / 100;
    const conversion = this.conversionRepo.create({
      ...data,
      partnerId: partner?.id || data.partnerId || '',
      commissionRate: rate,
      commissionAmount: amount,
    });
    const saved = await this.conversionRepo.save(conversion);
    if (partner) {
      await this.partnerRepo.increment({ id: partner.id }, 'totalConversions', 1);
      await this.partnerRepo.increment({ id: partner.id }, 'totalEarned', amount);
      await this.partnerRepo.increment({ id: partner.id }, 'pendingPayout', amount);
      // Upgrade tier based on total earned
      const updated = await this.partnerRepo.findOne({ where: { id: partner.id } });
      if (updated) {
        let tier = AffiliatePartnerTier.BRONZE;
        if (Number(updated.totalEarned) >= 50_000_000) tier = AffiliatePartnerTier.PLATINUM;
        else if (Number(updated.totalEarned) >= 10_000_000) tier = AffiliatePartnerTier.GOLD;
        else if (Number(updated.totalEarned) >= 2_000_000) tier = AffiliatePartnerTier.SILVER;
        await this.partnerRepo.update(partner.id, { tier });
      }
    }
    return saved;
  }

  async approveConversion(id: string) {
    const conv = await this.conversionRepo.findOne({ where: { id } });
    if (!conv) throw new NotFoundException('Conversion không tồn tại');
    await this.conversionRepo.update(id, { status: ConversionStatus.APPROVED });
    return conv;
  }

  async payConversion(id: string) {
    const conv = await this.conversionRepo.findOne({ where: { id } });
    if (!conv) throw new NotFoundException('Conversion không tồn tại');
    await this.conversionRepo.update(id, { status: ConversionStatus.PAID });
    if (conv.partnerId) {
      await this.partnerRepo.increment({ id: conv.partnerId }, 'paidOut', conv.commissionAmount);
      await this.partnerRepo.decrement({ id: conv.partnerId }, 'pendingPayout', conv.commissionAmount);
    }
    return conv;
  }

  async getPartnerStats(partnerId: string) {
    const partner = await this.findPartner(partnerId);
    const conversions = await this.conversionRepo.find({ where: { partnerId } });
    return {
      partner,
      clicks: partner.totalClicks,
      conversions: partner.totalConversions,
      conversionRate: partner.totalClicks > 0
        ? ((partner.totalConversions / partner.totalClicks) * 100).toFixed(2)
        : '0',
      totalEarned: partner.totalEarned,
      pendingPayout: partner.pendingPayout,
      paidOut: partner.paidOut,
      recentConversions: conversions.slice(-10),
    };
  }
}
