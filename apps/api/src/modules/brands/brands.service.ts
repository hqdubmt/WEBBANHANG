import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../../database/entities/brand.entity';
import { toSlug } from '../../common/slug.util';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly repo: Repository<Brand>,
  ) {}

  findAll() {
    return this.repo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Thương hiệu không tồn tại');
    return item;
  }

  create(data: Partial<Brand>) {
    if (!data.slug && data.name) {
      data.slug = toSlug(data.name);
    }
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Brand>) {
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { isActive: false });
    return { deleted: true };
  }
}
