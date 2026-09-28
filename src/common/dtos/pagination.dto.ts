import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Hard bounds for externally controlled pagination (R-06).
 *
 * MAX_PAGE_SIZE matches the largest page any current client asks for — the
 * create-blog page fetches 100 category suggestions in one request — so every
 * legitimate frontend call stays valid while `limit=1000000`-style queries
 * are rejected before they can reach the database.
 *
 * MAX_PAGE_NUMBER bounds the deepest possible OFFSET: even at the smallest
 * page size no query can skip more than 1_000_000 rows.
 */
export const MAX_PAGE_SIZE = 100;
export const MAX_PAGE_NUMBER = 10_000;

export class PaginationDto {
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_PAGE_NUMBER,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_NUMBER)
  page?: number;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;
}
