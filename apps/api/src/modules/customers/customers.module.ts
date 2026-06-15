import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { Order } from '../../database/entities/order.entity';
import { Notification } from '../../database/entities/notification.entity';
import { Coupon } from '../../database/entities/coupon.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerHealthService } from './customer-health.service';
import { RetentionService } from './retention.service';
import { LoyaltyService } from './loyalty.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Order, Notification, Coupon]),
    AiModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerHealthService, RetentionService, LoyaltyService],
  exports: [CustomersService, CustomerHealthService, RetentionService, LoyaltyService],
})
export class CustomersModule {}
