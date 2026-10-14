import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

/** Fallback used in every non-production environment when unset. */
export const DEFAULT_GOOGLE_CALLBACK_URL =
  'http://localhost:3000/auth/google/redirect';

/**
 * Resolve the Google OAuth callback URL.
 *
 * - Returns `GOOGLE_CALLBACK_URL` when set (non-empty after trim).
 * - In production (`NODE_ENV=production`) throws a clear startup error when
 *   the variable is missing instead of silently falling back to localhost.
 * - In all other environments falls back to the localhost callback.
 *
 * Called from the strategy constructor, which Nest instantiates during
 * application bootstrap — so a missing production value fails fast at
 * startup, not on the first OAuth attempt.
 */
export function resolveGoogleCallbackUrl(): string {
  const configured = process.env.GOOGLE_CALLBACK_URL?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'GOOGLE_CALLBACK_URL is not set. Set it to the public callback URL ' +
        '(e.g. https://your-domain/auth/google/redirect) in production.',
    );
  }
  return DEFAULT_GOOGLE_CALLBACK_URL;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_SECRET_ID,
      callbackURL: resolveGoogleCallbackUrl(),
      scope: ['email', 'profile'],
    });
  }

  validate(accessToken: string, _refreshToken: string, profile: Profile) {
    const { name, emails, photos } = profile;

    const [emailData] = emails ?? [];
    const [image] = photos ?? [];

    return {
      firstName: name?.givenName,
      lastName: name?.familyName,
      email: emailData?.value,
      profile_image: image?.value,
      accessToken,
    };
  }
}
