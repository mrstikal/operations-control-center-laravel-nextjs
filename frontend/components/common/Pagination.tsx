"use client";

import { useState } from "react";
import type { Pagination } from "@/lib/types";

type PaginationProps = {
  pagination: Pagination;
  page: number;
  perPage: number;
  loading?: boolean;
  onPageChangeAction: (page: number) => void;
  onPerPageChangeAction: (perPage: number) => void;
};

export default function PaginationComponent({
  pagination,
  page,
  perPage,
  loading = false,
  onPageChangeAction,
  onPerPageChangeAction,
}: PaginationProps) {
  const [goToPageInput, setGoToPageInput] = useState("");

  const handleGoToPage = () => {
    const pageNum = Number(goToPageInput);
    if (pageNum > 0 && pageNum <= pagination.last_page) {
      onPageChangeAction(pageNum);
      setGoToPageInput("");
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(pagination.last_page, page + 2);

    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push("...");
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < pagination.last_page) {
      if (end < pagination.last_page - 1) {
        pages.push("...");
      }
      pages.push(pagination.last_page);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-3">
      <div className="text-sm text-slate-600">
        Total {pagination.total} · Page {pagination.current_page} of{" "}
        {Math.max(1, pagination.last_page)}
      </div>

      <div className="flex items-end gap-3">
        {/* Per page */}
        <div className="flex flex-col">
          <label className="text-xs text-slate-600">Per page</label>
          <select
            value={perPage}
            onChange={(e) => {
              onPerPageChangeAction(Number(e.target.value));
              onPageChangeAction(1);
            }}
            disabled={loading}
            className="rounded-sm border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 hover:border-slate-400 disabled:opacity-60"
          >
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>

        {/* Previous button */}
        <button
          type="button"
          className="rounded-sm bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600 disabled:opacity-60"
          disabled={loading || pagination.current_page <= 1}
          onClick={() => onPageChangeAction(Math.max(1, page - 1))}
        >
          Previous
        </button>

        {/* Page links */}
        <div className="flex gap-1">
          {pageNumbers.map((pageNum, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading || pageNum === "..."}
              onClick={() => {
                if (typeof pageNum === "number") {
                  onPageChangeAction(pageNum);
                }
              }}
              className={`rounded-sm px-2 py-2 text-xs transition-colors disabled:cursor-not-allowed ${
                pageNum === "..."
                  ? "bg-white text-slate-600 cursor-not-allowed"
                  : pageNum === page
                    ? "bg-slate-700 text-white font-medium"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        {/* Next button */}
        <button
          type="button"
          className="rounded-sm bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600 disabled:opacity-60"
          disabled={loading || pagination.current_page >= pagination.last_page}
          onClick={() => onPageChangeAction(Math.min(pagination.last_page, page + 1))}
        >
          Next
        </button>

        {/* Go to page */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max={pagination.last_page}
            value={goToPageInput}
            onChange={(e) => setGoToPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleGoToPage();
              }
            }}
            placeholder="Page #"
            disabled={loading}
            className="rounded-sm border border-slate-300 bg-white px-3 py-1 w-24 text-sm text-slate-700 placeholder-slate-500 hover:border-slate-400 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleGoToPage}
            disabled={loading || !goToPageInput}
            className="rounded-sm bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600 disabled:opacity-60"
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
}
