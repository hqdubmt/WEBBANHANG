import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../../database/entities/supplier.entity';
import { SupplierProduct } from '../../database/entities/supplier-product.entity';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { SupplierProductsService } from './supplier-products.service';
import { SupplierProductsController } from './supplier-products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, SupplierProduct])],
  providers: [SuppliersService, SupplierProductsService],
  controllers: [SuppliersController, SupplierProductsController],
  exports: [SuppliersService, SupplierProductsService],
})
export class SuppliersModule {}
