import { PaginationDto } from '../dtos/pagination.dto';

export function paginationSolver(paginationDto: PaginationDto) {
  let { page = 1, limit = 10 } = paginationDto;
  if (!page || page < 1) page = 1;
  if (!limit || limit <= 0) limit = 10;
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
