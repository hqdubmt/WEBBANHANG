import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MobileSession } from '../../database/entities/mobile-session.entity';
import { MobileService } from './mobile.service';
import { MobileController } from './mobile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MobileSession])],
  controllers: [MobileController],
  providers: [MobileService],
  exports: [MobileService],
})
export class MobileModule {}
