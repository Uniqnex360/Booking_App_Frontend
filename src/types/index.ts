export interface ApiResponse<T> {
  status: 'success' | 'error';
  code: number;
  data: T;
  message: string;
}
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
export interface ApiErrorResponse {
  detail: string;
  status: number;
}

