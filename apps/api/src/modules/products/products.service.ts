import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, ILike } from 'typeorm';
import { Product, ProductStatus } from '../../database/entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.repo.create(dto);
    return this.repo.save(product);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: ProductStatus;
  }) {
    const { search, category, status } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const where: any = {};
    if (search) where.name = ILike(`%${search}%`);
    if (category) where.category = category;
    if (status) where.status = status;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { trendScore: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async update(id: string, dto: Partial<CreateProductDto>): Promise<Product> {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.delete(id);
  }

  async getHotProducts(limit = 100): Promise<Product[]> {
    // Trộn random để tránh lặp cùng một sản phẩm mỗi lần
    return this.repo
      .createQueryBuilder('p')
      .where('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('p."affiliateLink" IS NOT NULL')
      .orderBy('RANDOM()')
      .take(limit)
      .getMany();
  }

  async bulkUpsert(products: Partial<Product>[]): Promise<void> {
    const valid = products.filter(p => p.sourceId && p.sourceId.trim() !== '');
    if (valid.length === 0) return;
    await this.repo.upsert(valid, ['sourceId']);
  }
}
