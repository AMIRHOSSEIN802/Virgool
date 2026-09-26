import { Global, Module } from '@nestjs/common';
import { OtpDeliveryService } from './otp-delivery.service';

/**
 * Global so AuthService / UserService can inject the delivery service without
 * module-import cycles. The service itself has no dependencies.
 */
@Global()
@Module({
  providers: [OtpDeliveryService],
  exports: [OtpDeliveryService],
})
export class OtpDeliveryModule {}
