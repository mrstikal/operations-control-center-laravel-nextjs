"use client";

import { useEffect, useRef, useState } from "react";
import { searchGlobal } from "@/lib/api/search";
import type { SearchResultItem } from "@/lib/types/search";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function useGlobalSearch(perPage = 8) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [settledQuery, setSettledQuery] = useState("");

  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      return;
    }

    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;
    const requestedQuery = debouncedQuery;
    let active = true;

    searchGlobal({ q: debouncedQuery, per_page: perPage })
      .then((response) => {
        if (!active || currentRequestId !== requestIdRef.current) return;
        setSearchResults(Array.isArray(response.data) ? response.data : []);
        setSearchError(null);
        setSettledQuery(requestedQuery);
      })
      .catch((err) => {
        if (!active || currentRequestId !== requestIdRef.current) return;
        setSearchResults([]);
        setSearchError(err instanceof Error ? err.message : "Search failed");
        setSettledQuery(requestedQuery);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, perPage]);

  const isQueryTooShort = debouncedQuery.length < MIN_QUERY_LENGTH;
  const loading = !isQueryTooShort && settledQuery !== debouncedQuery;
  const hasSearched = !isQueryTooShort && settledQuery === debouncedQuery;
  const error = loading || isQueryTooShort ? null : searchError;

  return {
    query,
    setQuery,
    results: isQueryTooShort ? [] : searchResults,
    loading,
    error,
    hasSearched,
    minQueryLength: MIN_QUERY_LENGTH,
  };
}

