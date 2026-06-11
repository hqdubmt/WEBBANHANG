import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DropshipProduct } from '../../database/entities/dropship-product.entity';
import { DropshipOrder } from '../../database/entities/dropship-order.entity';
import { DropshipController } from './dropship.controller';
import { DropshipService } from './dropship.service';

@Module({
  imports: [TypeOrmModule.forFeature([DropshipProduct, DropshipOrder])],
  controllers: [DropshipController],
  providers: [DropshipService],
  exports: [DropshipService],
})
export class DropshipModule {}
