"use client";

import { useState, useRef, useEffect, useMemo } from "react";

export type SearchableSelectOption = {
  id: string | number;
  label: string;
  value: string | number;
  muted?: boolean;
};

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | number | "";
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  required = false,
  disabled = false,
  loading = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const minInputWidthCh = useMemo(() => {
    const longestOptionLabel = options.reduce(
      (maxLength, option) => Math.max(maxLength, option.label.length),
      0
    );

    // Reserve for inner padding and right arrow
    return Math.max(longestOptionLabel, placeholder.length) + 4;
  }, [options, placeholder]);

  // Filtered options
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selected option
  const selectedOption = options.find((opt) => opt.value === value);
  const selectedOptionMuted = Boolean(selectedOption?.muted);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
          setSearchTerm("");
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        break;
    }
  }

  function handleSelect(option: SearchableSelectOption) {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(0);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchTerm(e.target.value);
    setHighlightedIndex(0);
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-600">*</span>}
        </label>
      )}

      <div className="relative mt-1" style={{ minWidth: `${minInputWidthCh}ch` }}>
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isOpen ? searchTerm : selectedOption?.label || ""}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`leading-none w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 ${
            !isOpen && selectedOptionMuted ? "text-slate-500" : "text-slate-900"
          }`}
        />

        {/* Chevron Down Icon */}
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <ul
          ref={listRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-sm border border-slate-300 bg-white shadow-lg"
        >
          {loading && <li className="px-3 py-2 text-sm text-slate-500 text-center">Loading...</li>}

          {!loading && filteredOptions.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500 text-center">No options found</li>
          )}

          {!loading &&
            filteredOptions.map((option, index) => (
              <li
                key={option.id}
                onClick={() => handleSelect(option)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  index === highlightedIndex
                    ? option.muted
                      ? "bg-blue-100 text-blue-600"
                      : "bg-blue-100 text-blue-900"
                    : value === option.value
                      ? option.muted
                        ? "bg-blue-50 text-blue-400 font-medium"
                        : "bg-blue-50 text-blue-600 font-medium"
                      : option.muted
                        ? "text-slate-400 hover:bg-slate-50"
                        : "text-slate-900 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
