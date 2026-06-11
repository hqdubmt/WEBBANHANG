import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhiteLabelClient } from '../../database/entities/white-label-client.entity';
import { WhiteLabelService } from './white-label.service';
import { WhiteLabelController } from './white-label.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WhiteLabelClient])],
  controllers: [WhiteLabelController],
  providers: [WhiteLabelService],
  exports: [WhiteLabelService],
})
export class WhiteLabelModule {}
