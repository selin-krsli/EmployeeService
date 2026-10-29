/** One page returned by the list endpoints (`PagedResult`). */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export const PAGE_SIZE = 5;
