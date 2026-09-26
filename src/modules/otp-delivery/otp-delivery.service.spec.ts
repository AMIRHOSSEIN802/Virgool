/**
 * OtpDeliveryService — transport resolution and fail-safe behavior (R-01).
 *
 * Contract under test:
 * - SMTP is used for email when SMTP_HOST is configured (any environment).
 * - Outside production, missing configuration falls back to the dev console
 *   transport (the code is printed locally instead of being emailed).
 * - In production there is NO fallback: missing configuration fails safely
 *   with a 500 and no console output — the secret never reaches a log.
 * - SMTP provider failures are swallowed into a generic error that does not
 *   contain the OTP code.
 */
import { InternalServerErrorException } from '@nestjs/common';
import { createTransport } from 'nodemailer';

import { OtpDeliveryService } from './otp-delivery.service';
import { ConsoleTransport } from './transports/console.transport';
import { OtpDeliveryError } from 'src/common/enums/message.enum';

jest.mock('nodemailer', () => {
  const sendMail = jest.fn().mockResolvedValue({ accepted: [] });
  const createTransport = jest.fn(() => ({ sendMail }));
  return { __esModule: true, createTransport, sendMail };
});

const SMTP_KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
] as const;
const ENV_KEYS = [...SMTP_KEYS, 'NODE_ENV'] as const;

type SendMailArgs = { to: string; text: string; from: string; subject: string };
type NodemailerMock = {
  sendMail: jest.Mock<Promise<unknown>, [SendMailArgs]>;
  createTransport: jest.Mock;
};

const nodemailerMock = jest.requireMock<NodemailerMock>('nodemailer');
const sendMailMock = nodemailerMock.sendMail;
const createTransportMock = createTransport as unknown as jest.Mock;

const EMAIL_MESSAGE = {
  channel: 'email' as const,
  to: 'user@example.com',
  code: '48291',
};
const SMS_MESSAGE = {
  channel: 'sms' as const,
  to: '09129000001',
  code: '54321',
};

describe('OtpDeliveryService', () => {
  const service = new OtpDeliveryService();
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
    for (const key of SMTP_KEYS) delete process.env[key];
    jest.clearAllMocks();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = savedEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    jest.restoreAllMocks();
  });

  it('uses the dev console transport for email when SMTP is not configured', async () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    await service.send(EMAIL_MESSAGE);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0][0])).toContain('code=48291');
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('uses the dev console transport for SMS when no provider is wired', async () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    await service.send(SMS_MESSAGE);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0][0])).toContain('code=54321');
  });

  it('uses SMTP (never the console) when SMTP_HOST is configured', async () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_USER = 'mailer';
    process.env.SMTP_PASS = 'secret';

    await service.send(EMAIL_MESSAGE);

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com' }),
    );
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mail = sendMailMock.mock.calls[0][0];
    expect(mail.to).toBe('user@example.com');
    expect(mail.text).toContain('48291'); // the transport received the code
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('fails safely in production without SMTP — no console output, no code', async () => {
    process.env.NODE_ENV = 'production';
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    await expect(service.send(EMAIL_MESSAGE)).rejects.toThrow(
      InternalServerErrorException,
    );
    await expect(service.send(EMAIL_MESSAGE)).rejects.toThrow(
      OtpDeliveryError.NotConfigured,
    );
    expect(logSpy).not.toHaveBeenCalled();
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('fails safely in production for the SMS channel even with SMTP configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_HOST = 'smtp.example.com';

    await expect(service.send(SMS_MESSAGE)).rejects.toThrow(
      OtpDeliveryError.NotConfigured,
    );
  });

  it('uses SMTP in production when configured — console transport stays off', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_HOST = 'smtp.example.com';
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    await service.send(EMAIL_MESSAGE);

    expect(createTransportMock).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('turns SMTP provider failures into a generic error without the code', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    // Provider error deliberately echoes the secret — it must not survive.
    sendMailMock.mockRejectedValueOnce(
      new Error(`550 relay denied for ${EMAIL_MESSAGE.code}`),
    );

    const error = await service.send(EMAIL_MESSAGE).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(InternalServerErrorException);
    expect(String((error as Error).message)).toBe(OtpDeliveryError.Failed);
    expect(String((error as Error).message)).not.toContain(EMAIL_MESSAGE.code);
  });

  it('console transport refuses to run in production (defense in depth)', async () => {
    process.env.NODE_ENV = 'production';
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const transport = new ConsoleTransport();

    await expect(transport.send(EMAIL_MESSAGE)).rejects.toThrow(
      OtpDeliveryError.NotConfigured,
    );
    expect(logSpy).not.toHaveBeenCalled();
  });
});
