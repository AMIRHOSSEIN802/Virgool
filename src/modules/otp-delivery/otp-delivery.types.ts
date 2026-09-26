export type OtpChannel = 'email' | 'sms';

export interface OtpDeliveryMessage {
  channel: OtpChannel;
  /** Destination address: email address or phone number. */
  to: string;
  /** The OTP secret — must only ever reach the delivery transport. */
  code: string;
}

export interface OtpTransport {
  send(message: OtpDeliveryMessage): Promise<void>;
}
