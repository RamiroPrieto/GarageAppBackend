import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParkingsController } from './parkings.controller';
import { ParkingsService } from './parkings.service';

@Module({
  imports: [ConfigModule],
  controllers: [ParkingsController],
  providers: [ParkingsService],
})
export class ParkingsModule {}
