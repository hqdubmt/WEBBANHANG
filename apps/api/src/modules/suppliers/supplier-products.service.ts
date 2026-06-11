import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { SupplierProduct, SupplierProductStatus } from '../../database/entities/supplier-product.entity';

@Injectable()
export class SupplierProductsService {
  constructor(
    @InjectRepository(SupplierProduct)
    private readonly repo: Repository<SupplierProduct>,
  ) {}

  async list(page = 1, limit = 20, supplierId?: string, search?: string) {
    const qb = this.repo.createQueryBuilder('sp');
    if (supplierId) qb.where('sp.supplierId = :supplierId', { supplierId });
    if (search) qb.andWhere('sp.name ILIKE :s', { s: `%${search}%` });
    qb.orderBy('sp.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  bySupplier(supplierId: string) {
    return this.repo.find({ where: { supplierId, status: SupplierProductStatus.ACTIVE }, order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Sản phẩm nhà cung cấp không tồn tại');
    return item;
  }

  create(data: Partial<SupplierProduct>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<SupplierProduct>) {
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: SupplierProductStatus.INACTIVE });
    return { deleted: true };
  }
}
