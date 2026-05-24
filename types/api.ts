export type ApiResult<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
