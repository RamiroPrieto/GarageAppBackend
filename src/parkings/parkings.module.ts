import { Module } from '@nestjs/common';
import { ParkingsController } from './parkings.controller';
import { ParkingsService } from './parkings.service';

@Module({
  controllers: [ParkingsController],
  providers: [ParkingsService],
})
export class ParkingsModule {}