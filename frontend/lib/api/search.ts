import { get } from "@/lib/api/client";
import type { SearchQueryParams, SearchResultItem } from "@/lib/types/search";

export function searchGlobal(params: SearchQueryParams) {
  return get<SearchResultItem[]>("/search", params);
}

