import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { Product } from '../../database/entities/product.entity';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Lead } from '../../database/entities/lead.entity';
import { Category } from '../../database/entities/category.entity';
import { Notification } from '../../database/entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Order, OrderItem, Customer, Lead, Category, Notification])],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
