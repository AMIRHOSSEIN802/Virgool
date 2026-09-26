import { InternalServerErrorException } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { OtpDeliveryError } from 'src/common/enums/message.enum';
import { OtpDeliveryMessage, OtpTransport } from '../otp-delivery.types';

/**
 * Real out-of-band delivery via SMTP (nodemailer). Configuration comes from
 * the environment: SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS
 * / SMTP_FROM.
 *
 * Provider failures are translated into a generic exception — neither the
 * OTP code nor provider details are ever propagated to the client or logs.
 */
export class SmtpTransport implements OtpTransport {
  async send(message: OtpDeliveryMessage): Promise<void> {
    const host = process.env.SMTP_HOST;
    if (!host) {
      throw new InternalServerErrorException(OtpDeliveryError.NotConfigured);
    }
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user || 'no-reply@virgool.local';

    try {
      const transporter = createTransport({
        host,
        port,
        secure,
        ...(user ? { auth: { user, pass } } : {}),
      });
      await transporter.sendMail({
        from,
        to: message.to,
        subject: 'کد تایید ویرگول',
        text: `کد تایید شما: ${message.code}\nاین کد تا ۲ دقیقه معتبر است.`,
      });
    } catch {
      throw new InternalServerErrorException(OtpDeliveryError.Failed);
    }
  }
}
