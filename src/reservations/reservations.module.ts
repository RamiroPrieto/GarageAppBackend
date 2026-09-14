import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [ReservationsController],
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
