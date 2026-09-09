export interface PaginationMeta {
  totalCount: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface PaginatedResponse {
  pagination: PaginationMeta;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  message?: string;
  data?: T;
}
