"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useGlobalSearch } from "@/hooks/search/useGlobalSearch";
import type { SearchResultItem } from "@/lib/types/search";

function typeLabel(type: SearchResultItem["type"]): string {
  if (type === "contract") return "Contract";
  if (type === "incident") return "Incident";
  return "Asset";
}

export default function GlobalSearchBox() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { query, setQuery, results, loading, error, hasSearched, minQueryLength } = useGlobalSearch();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (!containerRef.current) return;
      if (event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-[340px] max-w-[42vw]">
      <input
        type="search"
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        placeholder="Search contracts, incidents, assets..."
        aria-label="Global search"
        className="w-full rounded-sm border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-slate-500 focus:outline-none"
      />

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-sm border border-slate-700 bg-slate-900 shadow-xl">
          {query.trim().length < minQueryLength && (
            <div className="px-3 py-2 text-xs text-slate-400">
              Type at least {minQueryLength} characters.
            </div>
          )}

          {query.trim().length >= minQueryLength && loading && (
            <div className="px-3 py-2 text-sm text-slate-300">Searching...</div>
          )}

          {query.trim().length >= minQueryLength && !loading && error && (
            <div className="px-3 py-2 text-sm text-red-300">{error}</div>
          )}

          {query.trim().length >= minQueryLength && !loading && !error && hasSearched && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-300">No results found.</div>
          )}

          {query.trim().length >= minQueryLength && !loading && !error && results.length > 0 && (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.action_url || "#"}
                    className="block px-3 py-2 hover:bg-slate-800"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-medium text-white">{item.title || "Untitled"}</div>
                      <span className="shrink-0 rounded bg-slate-700 px-2 py-0.5 text-[11px] text-slate-200">
                        {typeLabel(item.type)}
                      </span>
                    </div>
                    {item.subtitle && <div className="truncate text-xs text-slate-400">{item.subtitle}</div>}
                    {item.snippet && <div className="line-clamp-2 text-xs text-slate-500">{item.snippet}</div>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

