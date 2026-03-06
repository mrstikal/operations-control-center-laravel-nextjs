export type Pagination = {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
};

export type ListQuery = {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  incidents_presence?: "with" | "without";
  sort?: string;
  [key: string]: string | number | boolean | undefined;
};
