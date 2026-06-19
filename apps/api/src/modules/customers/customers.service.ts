import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Customer, CustomerTier } from '../../database/entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  async create(data: Partial<Customer>): Promise<Customer> {
    return this.repo.save(this.repo.create(data));
  }

  async findOrCreate(data: Partial<Customer>): Promise<Customer> {
    let customer: Customer;
    if (data.facebookId) {
      customer = await this.repo.findOne({ where: { facebookId: data.facebookId } });
    } else if (data.telegramId) {
      customer = await this.repo.findOne({ where: { telegramId: data.telegramId } });
    } else if (data.phone) {
      customer = await this.repo.findOne({ where: { phone: data.phone } });
    }
    if (!customer) {
      customer = this.repo.create({ ...data, name: data.name || 'Khách hàng' });
      customer = await this.repo.save(customer);
    }
    return customer;
  }

  async findAll(query: { page?: number; limit?: number; search?: string; tier?: CustomerTier }) {
    const { search, tier } = query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const where: any = {};
    if (search) where.name = ILike(`%${search}%`);
    if (tier) where.tier = tier;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { totalSpent: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Customer> {
    const c = await this.repo.findOne({ where: { id }, relations: ['orders'] });
    if (!c) throw new NotFoundException(`Customer ${id} not found`);
    return c;
  }

  async update(id: string, dto: Partial<Customer>): Promise<Customer> {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async upgradeVip(id: string): Promise<Customer> {
    return this.update(id, { tier: CustomerTier.VIP });
  }

  async recordPurchase(id: string, amount: number): Promise<void> {
    await this.repo.increment({ id }, 'totalOrders', 1);
    await this.repo.increment({ id }, 'totalSpent', amount);
    const customer = await this.repo.findOne({ where: { id } });
    if (customer.totalSpent >= 5000000 && customer.tier !== CustomerTier.VIP) {
      await this.upgradeVip(id);
    }
  }

  async remove(id: string): Promise<void> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Customer ${id} not found`);
    await this.repo.delete(id);
  }
}
