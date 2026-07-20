import { PaginationQueryDto } from './pagination-query.dto';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  query: Pick<PaginationQueryDto, 'page' | 'pageSize'>,
): PaginatedResult<T> {
  return {
    data: items,
    meta: {
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}
