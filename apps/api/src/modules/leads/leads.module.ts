import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../database/entities/lead.entity';
import { User } from '../../database/entities/user.entity';
import { Customer } from '../../database/entities/customer.entity';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadCaptureService } from './lead-capture.service';
import { LeadClassifierService } from './lead-classifier.service';
import { LeadRoutingService } from './lead-routing.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, User, Customer]), AiModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadCaptureService, LeadClassifierService, LeadRoutingService],
  exports: [LeadsService, LeadCaptureService, LeadClassifierService, LeadRoutingService],
})
export class LeadsModule {}
