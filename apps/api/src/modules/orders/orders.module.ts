import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Product } from '../../database/entities/product.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Payment } from '../../database/entities/payment.entity';
import { Notification } from '../../database/entities/notification.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderAutomationService } from './order-automation.service';
import { FulfillmentService } from './fulfillment.service';
import { CustomersModule } from '../customers/customers.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, Customer, Payment, Notification]),
    CustomersModule,
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderAutomationService, FulfillmentService],
  exports: [OrdersService, OrderAutomationService, FulfillmentService],
})
export class OrdersModule {}
