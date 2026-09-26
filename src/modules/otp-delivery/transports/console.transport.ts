import { InternalServerErrorException } from '@nestjs/common';
import { OtpDeliveryError } from 'src/common/enums/message.enum';
import { OtpDeliveryMessage, OtpTransport } from '../otp-delivery.types';

/**
 * Development-only delivery channel. When no SMTP provider is configured the
 * code is printed here INSTEAD of an email/SMS — this transport is the only
 * place in the codebase where an OTP secret may surface locally.
 *
 * Hard-disabled in production: even if it is constructed by mistake it
 * refuses to run, so the secret can never leak to production logs.
 */
export class ConsoleTransport implements OtpTransport {
  send(message: OtpDeliveryMessage): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      return Promise.reject(
        new InternalServerErrorException(OtpDeliveryError.NotConfigured),
      );
    }
    console.log(
      `[virgool:otp] channel=${message.channel} to=${message.to} code=${message.code}`,
    );
    return Promise.resolve();
  }
}
