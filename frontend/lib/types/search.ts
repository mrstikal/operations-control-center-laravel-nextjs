export type SearchEntityType = "contract" | "incident" | "asset";

export type SearchResultItem = {
  id: number;
  tenant_id: number;
  type: SearchEntityType;
  indexable_id: number;
  title: string | null;
  subtitle: string | null;
  status: string | null;
  action_url: string | null;
  snippet: string | null;
  indexed_at: string | null;
  updated_at: string | null;
};

export type SearchQueryParams = {
  q: string;
  per_page?: number;
  page?: number;
  all_tenants?: boolean;
};

