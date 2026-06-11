import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../database/entities/category.entity';
import { toSlug } from '../../common/slug.util';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  findAll() {
    return this.repo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  findTree() {
    return this.repo.find({ where: { parentId: undefined }, relations: ['children'], order: { sortOrder: 'ASC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id }, relations: ['children', 'parent'] });
    if (!item) throw new NotFoundException('Danh mục không tồn tại');
    return item;
  }

  create(data: Partial<Category>) {
    if (!data.slug && data.name) {
      data.slug = toSlug(data.name);
    }
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<Category>) {
    await this.findOne(id);
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
    return { deleted: true };
  }
}
