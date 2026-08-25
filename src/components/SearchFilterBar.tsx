import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Loader2, Sparkles, Tag, BookOpen, User, Hash, CornerDownLeft } from "lucide-react";
import { BlogPost } from "../types";
import { getSearchSuggestions, AutocompleteSuggestion } from "../lib/autocompleteUtils";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  allTags: string[];
  blogs: BlogPost[];
  onSelectArticle?: (blog: BlogPost) => void;
  isSearching?: boolean;
  totalResultsCount?: number;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedTag,
  onSelectTag,
  allTags,
  blogs,
  onSelectArticle,
  isSearching = false,
  totalResultsCount
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute suggestions based on query and dataset
  const { suggestions } = useMemo(() => {
    return getSearchSuggestions(blogs, searchQuery, 6);
  }, [blogs, searchQuery]);

  // Handle click outside to close autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFocused || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        e.preventDefault();
        applySuggestion(suggestions[activeSuggestionIndex]);
      } else {
        setIsFocused(false);
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  const applySuggestion = (suggestion: AutocompleteSuggestion) => {
    if (suggestion.type === "article" && suggestion.blogId && onSelectArticle) {
      const targetBlog = blogs.find((b) => b.id === suggestion.blogId);
      if (targetBlog) {
        onSelectArticle(targetBlog);
        setIsFocused(false);
        return;
      }
    }

    if (suggestion.type === "tag") {
      onSelectTag(suggestion.queryValue);
      onSearchChange("");
    } else {
      onSearchChange(suggestion.queryValue);
    }
    setIsFocused(false);
  };

  const handleClear = () => {
    onSearchChange("");
    setActiveSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="relative mb-12 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-center gap-4">
        {/* Search Input Box with Autocomplete and Micro Loading */}
        <div className="relative w-full lg:flex-1">
          {/* Left Icon (Search or Loading Spinner) */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none text-neutral-400 dark:text-neutral-500">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            placeholder="Search publications by keyword, equations, or models..."
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setActiveSuggestionIndex(-1);
            }}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            className="w-full pl-11 pr-24 py-3.5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-950/50 border border-neutral-200/60 dark:border-neutral-800 outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 focus:border-neutral-900 dark:focus:border-neutral-600 focus:bg-white dark:focus:bg-neutral-950 text-sm transition-all dark:text-neutral-100 dark:placeholder-neutral-500 font-sans"
          />

          {/* Right Status Badge & Clear Action */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isSearching && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-mono font-medium animate-pulse">
                <Sparkles className="w-2.5 h-2.5" /> Searching
              </span>
            )}

            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Intelligent Autocomplete Dropdown */}
          {isFocused && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 font-mono px-3">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-500" />
                  {searchQuery ? "Suggested Queries & Publications" : "Popular Research Topics"}
                </span>
                <span className="text-[10px]">
                  {typeof totalResultsCount === "number" && searchQuery
                    ? `${totalResultsCount} result${totalResultsCount === 1 ? "" : "s"}`
                    : "Tab or click to select"}
                </span>
              </div>

              <div className="p-1.5 max-h-72 overflow-y-auto no-scrollbar">
                {suggestions.map((suggestion, index) => {
                  const isSelected = index === activeSuggestionIndex;
                  return (
                    <div
                      key={suggestion.id}
                      onClick={() => applySuggestion(suggestion)}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            suggestion.type === "tag"
                              ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                              : suggestion.type === "article"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                              : suggestion.type === "author"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          {suggestion.type === "tag" ? (
                            <Tag className="w-3.5 h-3.5" />
                          ) : suggestion.type === "article" ? (
                            <BookOpen className="w-3.5 h-3.5" />
                          ) : suggestion.type === "author" ? (
                            <User className="w-3.5 h-3.5" />
                          ) : (
                            <Hash className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="truncate">
                          <p className="text-xs font-semibold truncate leading-tight">{suggestion.title}</p>
                          {suggestion.subtitle && (
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                              {suggestion.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {suggestion.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/50 dark:border-neutral-700/50">
                            {suggestion.badge}
                          </span>
                        )}
                        {isSelected && (
                          <CornerDownLeft className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Topic Filter Tags */}
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto no-scrollbar py-1 shrink-0">
          <button
            onClick={() => onSelectTag(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-all cursor-pointer ${
              !selectedTag
                ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                : "bg-neutral-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-750"
            }`}
          >
            All Topics
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectTag(tag === selectedTag ? null : tag)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-all cursor-pointer ${
                selectedTag === tag
                  ? "bg-black dark:bg-white text-white dark:text-black shadow-sm"
                  : "bg-neutral-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-750"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
