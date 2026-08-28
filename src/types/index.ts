export interface ApiResponse<T> {
  status: 'success' | 'error';
  code: number;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  detail: string;
  status: number;
}

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};
