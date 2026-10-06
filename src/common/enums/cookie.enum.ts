export enum CookieKeys {
  OTP = 'otp',
  EmailOTP = 'email-otp',
  PhoneOTP = 'phone-otp',
  /** R-05: opaque rotating refresh token — HttpOnly, never readable by JS. */
  Refresh = 'refresh_token',
}
