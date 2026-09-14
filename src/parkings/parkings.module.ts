import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParkingsController } from './parkings.controller';
import { ParkingsService } from './parkings.service';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [ConfigModule, ReservationsModule],
  controllers: [ParkingsController],
  providers: [ParkingsService],
})
export class ParkingsModule {}
