import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory, InventoryTxType } from '../../database/entities/inventory.entity';
import { Product } from '../../database/entities/product.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findByProduct(productId: string) {
    return this.inventoryRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async adjust(productId: string, quantity: number, txType: InventoryTxType, note?: string, supplierId?: string, unitCost?: number) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    const stockBefore = product.stock;
    let stockAfter = stockBefore;

    switch (txType) {
      case InventoryTxType.IMPORT:
      case InventoryTxType.RETURN:
        stockAfter = stockBefore + quantity;
        break;
      case InventoryTxType.EXPORT:
        stockAfter = Math.max(0, stockBefore - quantity);
        break;
      case InventoryTxType.ADJUST:
        stockAfter = quantity;
        break;
    }

    await this.productRepo.update(productId, { stock: stockAfter });

    const tx = this.inventoryRepo.create({
      productId,
      txType,
      quantity,
      stockBefore,
      stockAfter,
      note,
      supplierId,
      unitCost,
    });
    return this.inventoryRepo.save(tx);
  }

  async getLowStock(threshold = 10) {
    return this.productRepo
      .createQueryBuilder('p')
      .where('p.stock <= :threshold', { threshold })
      .andWhere('p.status = :status', { status: 'active' })
      .orderBy('p.stock', 'ASC')
      .getMany();
  }

  async getInventoryValue() {
    const result = await this.productRepo
      .createQueryBuilder('p')
      .select('SUM(p.stock * p.price)', 'totalValue')
      .addSelect('SUM(p.stock)', 'totalUnits')
      .getRawOne();

    return {
      totalValue: Number(result?.totalValue || 0),
      totalUnits: Number(result?.totalUnits || 0),
    };
  }
}
