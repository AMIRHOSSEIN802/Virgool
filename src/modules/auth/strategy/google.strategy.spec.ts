/**
 * Google OAuth callback URL configuration (Phase 1.4).
 *
 * Pure unit tests — no database needed. Covers:
 * - configured GOOGLE_CALLBACK_URL is honoured (trimmed),
 * - non-production falls back to the localhost callback when unset/blank,
 * - production fails fast with an actionable error when unset/blank,
 * - production honours a configured value.
 */
import {
  DEFAULT_GOOGLE_CALLBACK_URL,
  resolveGoogleCallbackUrl,
} from './google.strategy';

describe('resolveGoogleCallbackUrl', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.GOOGLE_CALLBACK_URL;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('returns the configured URL when set', () => {
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_CALLBACK_URL =
      'https://example.com/auth/google/redirect';
    expect(resolveGoogleCallbackUrl()).toBe(
      'https://example.com/auth/google/redirect',
    );
  });

  it('trims a configured URL', () => {
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_CALLBACK_URL =
      '  https://example.com/auth/google/redirect  ';
    expect(resolveGoogleCallbackUrl()).toBe(
      'https://example.com/auth/google/redirect',
    );
  });

  it.each(['test', 'development', undefined])(
    'falls back to localhost when unset in non-production (NODE_ENV=%s)',
    (nodeEnv) => {
      if (nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = nodeEnv;
      delete process.env.GOOGLE_CALLBACK_URL;
      expect(resolveGoogleCallbackUrl()).toBe(DEFAULT_GOOGLE_CALLBACK_URL);
      expect(DEFAULT_GOOGLE_CALLBACK_URL).toBe(
        'http://localhost:3000/auth/google/redirect',
      );
    },
  );

  it('falls back to localhost when blank in non-production', () => {
    process.env.NODE_ENV = 'test';
    process.env.GOOGLE_CALLBACK_URL = '   ';
    expect(resolveGoogleCallbackUrl()).toBe(DEFAULT_GOOGLE_CALLBACK_URL);
  });

  it('throws an actionable error in production when missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.GOOGLE_CALLBACK_URL;
    expect(() => resolveGoogleCallbackUrl()).toThrow(/GOOGLE_CALLBACK_URL/);
  });

  it('throws in production when blank', () => {
    process.env.NODE_ENV = 'production';
    process.env.GOOGLE_CALLBACK_URL = '';
    expect(() => resolveGoogleCallbackUrl()).toThrow(/GOOGLE_CALLBACK_URL/);
  });

  it('honours a configured URL in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.GOOGLE_CALLBACK_URL =
      'https://prod.example/auth/google/redirect';
    expect(resolveGoogleCallbackUrl()).toBe(
      'https://prod.example/auth/google/redirect',
    );
  });
});
