import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../../database/entities/payment.entity';
import { Order } from '../../database/entities/order.entity';
import { PaymentsService } from './payments.service';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order])],
  providers: [PaymentsService, PaymentGatewayService],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaymentGatewayService],
})
export class PaymentsModule {}
