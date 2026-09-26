import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { OtpDeliveryError } from 'src/common/enums/message.enum';
import {
  OtpChannel,
  OtpDeliveryMessage,
  OtpTransport,
} from './otp-delivery.types';
import { ConsoleTransport } from './transports/console.transport';
import { SmtpTransport } from './transports/smtp.transport';

/**
 * Pluggable OTP delivery (R-01).
 *
 * Transport resolution:
 * - email + SMTP_HOST configured → SMTP (nodemailer), any environment.
 * - anything else in production  → fails safely (500, no secret anywhere);
 *   there is no fallback that could expose the code in production logs.
 * - anything else outside production → dev console transport (the code is
 *   printed locally instead of being sent — the development inbox).
 *
 * The OTP code is handed to exactly one transport and is never part of an
 * HTTP response, application log, or error message.
 */
@Injectable()
export class OtpDeliveryService {
  async send(message: OtpDeliveryMessage): Promise<void> {
    const transport = this.resolveTransport(message.channel);
    await transport.send(message);
  }

  private resolveTransport(channel: OtpChannel): OtpTransport {
    if (channel === 'email' && this.isSmtpConfigured()) {
      return new SmtpTransport();
    }
    if (process.env.NODE_ENV === 'production') {
      // Fail safely: no transport available (or SMS provider not wired yet).
      throw new InternalServerErrorException(OtpDeliveryError.NotConfigured);
    }
    return new ConsoleTransport();
  }

  private isSmtpConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST);
  }
}
