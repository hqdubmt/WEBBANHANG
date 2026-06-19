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
import { Payment } from '../../database/entities/payment.entity';
import { PaymentGatewayService } from '../payments/payment-gateway.service';
import { AffiliateConversion } from '../../database/entities/affiliate-conversion.entity';
import { AffiliatePartner } from '../../database/entities/affiliate-partner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Order, OrderItem, Customer, Lead, Category, Notification, Payment, AffiliateConversion, AffiliatePartner])],
  controllers: [StorefrontController],
  providers: [StorefrontService, PaymentGatewayService],
})
export class StorefrontModule {}
