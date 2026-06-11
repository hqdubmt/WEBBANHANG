import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { DropshipProduct, DropshipStatus } from '../../database/entities/dropship-product.entity';
import { DropshipOrder, DropshipOrderStatus } from '../../database/entities/dropship-order.entity';

@Injectable()
export class DropshipService {
  constructor(
    @InjectRepository(DropshipProduct)
    private readonly productRepo: Repository<DropshipProduct>,
    @InjectRepository(DropshipOrder)
    private readonly orderRepo: Repository<DropshipOrder>,
  ) {}

  // --- Products ---

  async listProducts(page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (search) where.name = Like(`%${search}%`);
    const [items, total] = await this.productRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page, limit };
  }

  async findProduct(id: string) {
    const item = await this.productRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Sản phẩm dropship không tồn tại');
    return item;
  }

  createProduct(data: Partial<DropshipProduct>) {
    return this.productRepo.save(this.productRepo.create(data));
  }

  async updateProduct(id: string, data: Partial<DropshipProduct>) {
    await this.findProduct(id);
    await this.productRepo.update(id, data);
    return this.findProduct(id);
  }

  async removeProduct(id: string) {
    await this.findProduct(id);
    await this.productRepo.update(id, { status: DropshipStatus.INACTIVE });
    return { deleted: true };
  }

  async statsProducts() {
    const total = await this.productRepo.count();
    const active = await this.productRepo.count({ where: { status: DropshipStatus.ACTIVE } });
    const outOfStock = await this.productRepo.count({ where: { status: DropshipStatus.OUT_OF_STOCK } });
    return { total, active, outOfStock };
  }

  // --- Orders ---

  async listOrders(page = 1, limit = 20, status?: DropshipOrderStatus) {
    const where: any = {};
    if (status) where.status = status;
    const [items, total] = await this.orderRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total, page, limit };
  }

  async findOrder(id: string) {
    const item = await this.orderRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Đơn dropship không tồn tại');
    return item;
  }

  async createOrder(data: Partial<DropshipOrder>) {
    const product = await this.findProduct(data.dropshipProductId!);
    const order = this.orderRepo.create({
      ...data,
      productName: product.name,
      supplierName: product.supplierName,
      costPrice: product.costPrice,
      profit: Number(data.salePrice || 0) - Number(product.costPrice),
      orderCode: `DS-${Date.now()}`,
    });
    const saved = await this.orderRepo.save(order);
    await this.productRepo.increment({ id: product.id }, 'soldCount', data.quantity || 1);
    return saved;
  }

  async updateOrderStatus(id: string, status: DropshipOrderStatus) {
    await this.findOrder(id);
    await this.orderRepo.update(id, { status });
    return this.findOrder(id);
  }

  async statsOrders() {
    const total = await this.orderRepo.count();
    const pending = await this.orderRepo.count({ where: { status: DropshipOrderStatus.PENDING } });
    const shipped = await this.orderRepo.count({ where: { status: DropshipOrderStatus.SHIPPED } });
    const delivered = await this.orderRepo.count({ where: { status: DropshipOrderStatus.DELIVERED } });
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.profit)', 'totalProfit')
      .addSelect('SUM(o.salePrice)', 'totalRevenue')
      .where('o.status != :s', { s: DropshipOrderStatus.CANCELLED })
      .getRawOne();
    return {
      total, pending, shipped, delivered,
      totalProfit: Number(result?.totalProfit || 0),
      totalRevenue: Number(result?.totalRevenue || 0),
    };
  }
}
