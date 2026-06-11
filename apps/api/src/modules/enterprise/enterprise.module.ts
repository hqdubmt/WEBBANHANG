import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../../database/entities/tenant.entity';
import { EnterpriseService } from './enterprise.service';
import { EnterpriseController } from './enterprise.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [EnterpriseController],
  providers: [EnterpriseService],
  exports: [EnterpriseService],
})
export class EnterpriseModule {}
