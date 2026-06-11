import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier, SupplierStatus } from '../../database/entities/supplier.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly repo: Repository<Supplier>,
  ) {}

  findAll() {
    return this.repo.find({ where: { status: SupplierStatus.ACTIVE }, order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Nhà cung cấp không tồn tại');
    return item;
  }

  create(data: Partial<Supplier>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Supplier>) {
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: SupplierStatus.INACTIVE });
    return { deleted: true };
  }
}
