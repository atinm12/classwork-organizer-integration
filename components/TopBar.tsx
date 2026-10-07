"use client";

import { useEffect, useRef, useState } from "react";
import type { CourseworkItem } from "@/lib/types";
import { ChevronDown, RefreshIcon, SearchIcon, SettingsIcon, UserIcon } from "./icons";
import { useTracker } from "./TrackerContext";

const MAX_RESULTS = 8;

interface Props {
  query: string;
  onQuery: (q: string) => void;
  results: CourseworkItem[];
  onPick: (item: CourseworkItem) => void;
  onSettings: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export function TopBar({ query, onQuery, results, onPick, onSettings, onRefresh, loading }: Props) {
  const { timeZone, colorOf } = useTracker();
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

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

      <div className="profile" ref={menuRef}>
        <button type="button" className="profile-btn" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu">
          <span className="avatar">
            <UserIcon width={18} height={18} />
          </span>
          <ChevronDown width={14} height={14} />
        </button>
        {menuOpen && (
          <div className="menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onRefresh(); }} disabled={loading}>
              <RefreshIcon width={15} height={15} /> Refresh data
            </button>
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onSettings(); }}>
              <SettingsIcon width={15} height={15} /> Settings
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
