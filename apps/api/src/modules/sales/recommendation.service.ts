import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from '../../database/entities/product.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';

export interface RecommendationResult {
  product: Product;
  reason: string;
  type: 'upsell' | 'cross_sell';
  confidence: number;
}

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(Product)   private readonly productRepo: Repository<Product>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Order)     private readonly orderRepo: Repository<Order>,
  ) {}

  // ─── F03.1: Upsell — higher-value alternatives ───────────────────────────

  async getUpsells(productId: string, limit = 3): Promise<RecommendationResult[]> {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) return [];

    const candidates = await this.productRepo.find({
      where: {
        category: product.category,
        status: ProductStatus.ACTIVE,
      },
      order: { price: 'DESC', trendScore: 'DESC' },
      take: 20,
    });

    // Keep only products priced 10-100% higher
    const upsells = candidates
      .filter((p) => p.id !== productId && p.price > product.price * 1.1 && p.price <= product.price * 2)
      .slice(0, limit)
      .map((p): RecommendationResult => ({
        product: p,
        reason: `Nâng cấp từ ${product.name} — chất lượng cao hơn ${Math.round(((p.price - product.price) / product.price) * 100)}%`,
        type: 'upsell',
        confidence: Math.min(90, 60 + p.trendScore),
      }));

    return upsells;
  }

  // ─── F03.2: Cross-sell — frequently bought together ─────────────────────

  async getCrossSells(productId: string, limit = 3): Promise<RecommendationResult[]> {
    // Find orders containing this product
    const ordersWithProduct = await this.itemRepo
      .createQueryBuilder('i')
      .select('i.orderId', 'orderId')
      .where('i.productId = :id', { id: productId })
      .getRawMany();

    const orderIds = ordersWithProduct.map((r) => r.orderId).filter(Boolean);
    if (!orderIds.length) return this.getPopularCrossSells(productId, limit);

    // Find other products in those orders
    const coProducts = await this.itemRepo
      .createQueryBuilder('i')
      .select('i.productId', 'productId')
      .addSelect('COUNT(*)', 'coCount')
      .where('i.orderId IN (:...orderIds)', { orderIds: orderIds.slice(0, 100) })
      .andWhere('i.productId != :pid', { pid: productId })
      .groupBy('i.productId')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit * 2)
      .getRawMany();

    if (!coProducts.length) return this.getPopularCrossSells(productId, limit);

    const coProductIds = coProducts.map((r) => r.productId).filter(Boolean);
    const products = await this.productRepo.findByIds(coProductIds);
    const active = products.filter((p) => p.status === ProductStatus.ACTIVE).slice(0, limit);

    return active.map((p): RecommendationResult => ({
      product: p,
      reason: `Khách hàng thường mua cùng sản phẩm này`,
      type: 'cross_sell',
      confidence: 75,
    }));
  }

  // Fallback: popular products in different category
  private async getPopularCrossSells(productId: string, limit: number): Promise<RecommendationResult[]> {
    const product = await this.productRepo.findOneBy({ id: productId });
    const products = await this.productRepo.find({
      where: { status: ProductStatus.ACTIVE },
      order: { trendScore: 'DESC' },
      take: limit * 2,
    });

    return products
      .filter((p) => p.id !== productId && p.category !== product?.category)
      .slice(0, limit)
      .map((p): RecommendationResult => ({
        product: p,
        reason: 'Sản phẩm phổ biến khách thường xem',
        type: 'cross_sell',
        confidence: 50,
      }));
  }

  // ─── Combined recommendations for a cart / session ───────────────────────

  async getRecommendations(productIds: string[]): Promise<{
    upsells: RecommendationResult[];
    crossSells: RecommendationResult[];
  }> {
    if (!productIds.length) return { upsells: [], crossSells: [] };

    const anchor = productIds[0];
    const [upsells, crossSells] = await Promise.all([
      this.getUpsells(anchor, 3),
      this.getCrossSells(anchor, 4),
    ]);

    // Deduplicate across upsell/cross-sell and input products
    const usedIds = new Set(productIds);
    const filteredCross = crossSells.filter((r) => {
      if (usedIds.has(r.product.id)) return false;
      usedIds.add(r.product.id);
      return true;
    });

    return { upsells, crossSells: filteredCross };
  }

  // ─── Customer-level recommendations (based on order history) ─────────────

  async getPersonalizedRecommendations(customerId: string, limit = 5): Promise<RecommendationResult[]> {
    const recentItems = await this.itemRepo
      .createQueryBuilder('i')
      .innerJoin(Order, 'o', 'o.id = i.orderId')
      .select('i.productId', 'productId')
      .addSelect('COUNT(*)', 'count')
      .where('o.customerId = :cid', { cid: customerId })
      .andWhere('o.status != :s', { s: OrderStatus.CANCELLED })
      .groupBy('i.productId')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    if (!recentItems.length) {
      const popular = await this.productRepo.find({
        where: { status: ProductStatus.ACTIVE },
        order: { trendScore: 'DESC' },
        take: limit,
      });
      return popular.map((p) => ({
        product: p, reason: 'Sản phẩm bán chạy', type: 'cross_sell' as const, confidence: 40,
      }));
    }

    const boughtIds = recentItems.map((r) => r.productId);
    const boughtProducts = await this.productRepo.findByIds(boughtIds);
    const categories = [...new Set(boughtProducts.map((p) => p.category).filter(Boolean))];

    const candidates = await this.productRepo
      .createQueryBuilder('p')
      .where('p.status = :s', { s: ProductStatus.ACTIVE })
      .andWhere('p.category IN (:...cats)', { cats: categories.length ? categories : ['__none__'] })
      .andWhere('p.id NOT IN (:...bought)', { bought: boughtIds.length ? boughtIds : ['__none__'] })
      .orderBy('p.trendScore', 'DESC')
      .take(limit)
      .getMany();

    return candidates.map((p) => ({
      product: p,
      reason: `Dựa trên lịch sử mua hàng của bạn`,
      type: 'cross_sell' as const,
      confidence: 70,
    }));
  }
}
