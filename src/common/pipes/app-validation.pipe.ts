import { ValidationPipe } from '@nestjs/common';

/**
 * R-06 — the single strict validation configuration used by production
 * (main.ts) AND by every integration spec, so tests always exercise exactly
 * what ships:
 *
 *  - `whitelist` strips any property without a class-validator decorator,
 *  - `forbidNonWhitelisted` REJECTS unknown request properties with a 400
 *    instead of silently accepting them (mass-assignment hardening at every
 *    DTO boundary — service-level ownership/authorization checks are
 *    untouched and still required),
 *  - `transform` hands controllers the validated entity with `@Type`
 *    conversions applied (e.g. `page`/`limit` become numbers).
 *
 * `enableImplicitConversion` is deliberately OFF: it would coerce declared
 * types blindly (breaking validators that expect strings, like
 * `@IsNumberString`), so conversions stay explicit via `@Type`.
 */
export const createAppValidationPipe = (): ValidationPipe =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
