import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between } from 'typeorm';
import { Product, ProductStatus } from '../../database/entities/product.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { RagService, RagCollection } from '../rag/rag.service';

export interface ProductSearchOptions {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface RankedProduct {
  product: Product;
  rankScore: number;
  rankFactors: {
    trendScore: number;
    salesVelocity: number;
    marginScore: number;
    stockScore: number;
  };
}

@Injectable()
export class ProductDiscoveryService {
  constructor(
    @InjectRepository(Product)   private readonly productRepo: Repository<Product>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    private readonly ragService: RagService,
  ) {}

  // ─── F01.1: Product Search ────────────────────────────────────────────────

  async search(opts: ProductSearchOptions): Promise<Product[]> {
    const { query, category, minPrice, maxPrice, limit = 10 } = opts;

    // Semantic search via RAG if query provided
    if (query) {
      const hits = await this.ragService.search(RagCollection.PRODUCTS, query, limit);
      if (hits.length >= 3) {
        const ids = hits.map((h) => h.payload?.id as string).filter(Boolean);
        if (ids.length) {
          const products = await this.productRepo.findByIds(ids);
          return products.filter((p) => p.status === ProductStatus.ACTIVE);
        }
      }
    }

    // Fallback: keyword + filters
    const where: any = { status: ProductStatus.ACTIVE };
    if (query) where.name = ILike(`%${query}%`);
    if (category) where.category = category;
    if (minPrice !== undefined && maxPrice !== undefined) {
      where.price = Between(minPrice, maxPrice);
    }

    return this.productRepo.find({
      where,
      order: { trendScore: 'DESC', stock: 'DESC' },
      take: limit,
    });
  }

  // ─── F01.2: Product Ranking ───────────────────────────────────────────────

  async getRankedProducts(limit = 20): Promise<RankedProduct[]> {
    const products = await this.productRepo.find({
      where: { status: ProductStatus.ACTIVE },
      take: 100,
    });

    // Sales velocity: units sold in last 30 days
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const salesData = await this.itemRepo
      .createQueryBuilder('i')
      .select('i.productId', 'productId')
      .addSelect('SUM(i.quantity)', 'units')
      .where('i.createdAt >= :d', { d: since30d })
      .groupBy('i.productId')
      .getRawMany();

    const salesMap = new Map(salesData.map((r) => [r.productId, parseInt(r.units ?? '0')]));
    const maxSales = Math.max(...salesMap.values(), 1);

    const ranked = products.map((p): RankedProduct => {
      const salesVelocity = ((salesMap.get(p.id) ?? 0) / maxSales) * 100;
      const marginScore = p.costPrice > 0
        ? Math.min(100, ((p.price - p.costPrice) / p.price) * 100)
        : 50;
      const stockScore = p.stock > 0 ? Math.min(100, (p.stock / 50) * 100) : 0;
      const trendScore = Math.min(100, p.trendScore ?? 0);

      const rankScore =
        trendScore     * 0.30 +
        salesVelocity  * 0.35 +
        marginScore    * 0.25 +
        stockScore     * 0.10;

      return {
        product: p,
        rankScore: Math.round(rankScore),
        rankFactors: {
          trendScore: Math.round(trendScore),
          salesVelocity: Math.round(salesVelocity),
          marginScore: Math.round(marginScore),
          stockScore: Math.round(stockScore),
        },
      };
    });

    return ranked
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, limit);
  }

  // ─── Quick lookup by category ─────────────────────────────────────────────

  async getByCategory(category: string, limit = 10): Promise<Product[]> {
    return this.productRepo.find({
      where: { category, status: ProductStatus.ACTIVE },
      order: { trendScore: 'DESC' },
      take: limit,
    });
  }
}
