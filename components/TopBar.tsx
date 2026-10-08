"use client";

import { useState } from "react";
import type { CourseworkItem } from "@/lib/types";
import { SearchIcon } from "./icons";
import { useTracker } from "./TrackerContext";

const MAX_RESULTS = 8;

interface Props {
  query: string;
  onQuery: (q: string) => void;
  results: CourseworkItem[];
  onPick: (item: CourseworkItem) => void;
}

export function TopBar({ query, onQuery, results, onPick }: Props) {
  const { timeZone, colorOf } = useTracker();
  const [focused, setFocused] = useState(false);
  const showResults = focused && query.trim().length > 0;

  return (
    <header className="topbar">
      <div className="search">
        <SearchIcon className="search-icon" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onQuery("");
            if (e.key === "Enter" && results[0]) onPick(results[0]);
          }}
          placeholder="Search assignments, classes, or topics..."
          aria-label="Search assignments"
        />
        {showResults && (
          <div className="search-results" role="listbox">
            {results.length === 0 ? (
              <div className="search-empty">No matches</div>
            ) : (
              results.slice(0, MAX_RESULTS).map((i) => (
                <button key={i.id} type="button" role="option" aria-selected={false} className="search-result" onMouseDown={() => onPick(i)}>
                  <span className="dot" style={{ background: colorOf(i.course).accent }} />
                  <span className="search-result-title">{i.title}</span>
                  <span className="muted small">{i.course}</span>
                  <span className="muted small search-result-date">
                    {i.dueDate
                      ? new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(new Date(i.dueDate))
                      : "TBA"}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </header>
  );
}
