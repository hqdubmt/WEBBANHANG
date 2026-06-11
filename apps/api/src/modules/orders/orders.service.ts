import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Product } from '../../database/entities/product.entity';
import { CustomersService } from '../customers/customers.service';

interface CreateOrderDto {
  customerId: string;
  items: Array<{
    productId: string;
    productName?: string;
    productImage?: string;
    affiliateLink?: string;
    price: number;
    quantity: number;
    commission?: number;
  }>;
  source?: string;
  note?: string;
  shippingAddress?: string;
  discount?: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly customersService: CustomersService,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    const subtotal = dto.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = dto.discount || 0;
    const total = subtotal - discount;

    const order = this.orderRepo.create({
      orderCode: `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      customerId: dto.customerId,
      source: dto.source as any,
      note: dto.note,
      shippingAddress: dto.shippingAddress,
      subtotal,
      discount,
      total,
    });
    const saved = await this.orderRepo.save(order);

    const productNames: Record<string, string> = {};
    for (const i of dto.items) {
      if (!i.productName) {
        const p = await this.productRepo.findOne({ where: { id: i.productId } });
        productNames[i.productId] = p?.name || i.productId;
      }
    }

    const items = dto.items.map((i) =>
      this.itemRepo.create({
        orderId: saved.id,
        productId: i.productId,
        productName: i.productName || productNames[i.productId],
        productImage: i.productImage,
        affiliateLink: i.affiliateLink,
        price: i.price,
        quantity: i.quantity,
        total: i.price * i.quantity,
        commission: i.commission || 0,
      }),
    );
    await this.itemRepo.save(items);

    await this.customersService.recordPurchase(dto.customerId, total);
    return this.findOne(saved.id);
  }

  async findAll(query: { page?: number; limit?: number; status?: OrderStatus; customerId?: string }) {
    const { status, customerId } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [items, total] = await this.orderRepo.findAndCount({
      where,
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Order> {
    const o = await this.orderRepo.findOne({ where: { id }, relations: ['items'] });
    if (!o) throw new NotFoundException(`Order ${id} not found`);
    return o;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    await this.orderRepo.update(id, { status });
    return this.findOne(id);
  }

  async getRevenueSummary(days = 30): Promise<{ total: number; orders: number; avgOrder: number }> {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.total)', 'total')
      .addSelect('COUNT(o.id)', 'orders')
      .where('o.createdAt >= :from', { from })
      .andWhere('o.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .getRawOne();
    const total = parseFloat(result.total || '0');
    const orders = parseInt(result.orders || '0');
    return { total, orders, avgOrder: orders > 0 ? total / orders : 0 };
  }
}
