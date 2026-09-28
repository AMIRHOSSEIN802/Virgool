import { MAX_PAGE_SIZE, PaginationDto } from '../dtos/pagination.dto';

/**
 * Turns validated pagination input into `{ page, limit, skip }`.
 *
 * HTTP-level validation (PaginationDto) rejects malformed/oversized values
 * with a 400 before a request ever reaches here; the guards below are defense
 * in depth so that NO caller — internal or otherwise — can produce an
 * unbounded or NaN query.
 */
export function paginationSolver(paginationDto: PaginationDto) {
  let page = Number(paginationDto?.page ?? 1);
  let limit = Number(paginationDto?.limit ?? 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit <= 0) limit = 10;
  if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;
  const skip = (page - 1) * limit;
  return {
    page,
    limit,
    skip,
  };
}

export function paginationGenerator(
  count: number = 0,
  page: number = 0,
  limit: number = 0,
) {
  return {
    totalCount: count,
    page: +page,
    limit: +limit,
    pageCount: Math.ceil(count / limit),
  };
}
