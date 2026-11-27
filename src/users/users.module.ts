import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [EmailModule, SmsModule, PaymentsModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
