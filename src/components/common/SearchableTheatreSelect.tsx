import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, Search, ChevronDown, Check, X } from 'lucide-react';

export interface TheatreSelectItem {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  chain_name?: string | null;
  address?: string | null;
}

export interface SearchableTheatreSelectProps {
  value: string;
  onChange: (value: string) => void;
  theatres: TheatreSelectItem[];
  allOptionLabel?: string;
  allOptionValue?: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
}

export const SearchableTheatreSelect: React.FC<SearchableTheatreSelectProps> = ({
  value,
  onChange,
  theatres,
  allOptionLabel = 'All Theatres / Venues',
  allOptionValue = '',
  placeholder = 'All Theatres / Venues',
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  disabled = false,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter theatres
  const filteredTheatres = useMemo(() => {
    if (!searchTerm.trim()) return theatres;
    const q = searchTerm.toLowerCase();
    return theatres.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.city && t.city.toLowerCase().includes(q)) ||
        (t.state && t.state.toLowerCase().includes(q)) ||
        (t.chain_name && t.chain_name.toLowerCase().includes(q)) ||
        (t.address && t.address.toLowerCase().includes(q))
    );
  }, [theatres, searchTerm]);

  // Current selected theatre
  const selectedTheatre = useMemo(() => {
    if (!value || value === allOptionValue) return null;
    return theatres.find((t) => t.id === value) || null;
  }, [theatres, value, allOptionValue]);

  const isAllSelected = !value || value === allOptionValue;

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-10 rounded-xl border border-gray-200 px-3 bg-gray-50/80 hover:bg-white focus:bg-white text-xs font-semibold text-gray-700 cursor-pointer transition shadow-2xs flex items-center justify-between gap-2 max-w-[230px] sm:max-w-[270px] ${
          isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-400 bg-white' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${buttonClassName}`}
        title={selectedTheatre ? `${selectedTheatre.name} (${selectedTheatre.city || ''})` : allOptionLabel}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">
            {selectedTheatre ? (
              <>
                <span className="text-gray-900 font-semibold">{selectedTheatre.name}</span>
                {selectedTheatre.city && (
                  <span className="text-gray-500 font-normal ml-1">({selectedTheatre.city})</span>
                )}
              </>
            ) : (
              <span>{allOptionLabel}</span>
            )}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu with Search */}
      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-[280px] sm:w-[320px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-2 space-y-2 animate-in fade-in-50 duration-150 ${dropdownClassName}`}
        >
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search theatre, city, chain..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-8 py-2 text-xs text-gray-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsOpen(false);
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Counts Header */}
          <div className="text-[10px] text-gray-400 px-1.5 flex justify-between font-medium">
            <span>Filter by Theatre</span>
            <span>
              {filteredTheatres.length} of {theatres.length} locations
            </span>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {/* "All Theatres / Venues" Option */}
            <button
              type="button"
              onClick={() => {
                onChange(allOptionValue);
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={`w-full text-left p-2 rounded-xl text-xs transition flex items-center justify-between group ${
                isAllSelected
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-semibold'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isAllSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="font-semibold truncate">{allOptionLabel}</div>
                  <div className="text-[10px] text-gray-400">Show data across all venues</div>
                </div>
              </div>
              {isAllSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />}
            </button>

            {/* Individual Theatres */}
            {filteredTheatres.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">
                No theatres match &ldquo;{searchTerm}&rdquo;
              </div>
            ) : (
              filteredTheatres.map((t) => {
                const isSelected = t.id === value;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChange(t.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left p-2 rounded-xl text-xs transition flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-semibold'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="truncate pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
                          {t.name}
                        </span>
                        {t.city && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-normal">
                            {t.city}
                          </span>
                        )}
                        {t.chain_name && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1 py-0.2 rounded font-medium">
                            {t.chain_name}
                          </span>
                        )}
                      </div>
                      {t.address && (
                        <div className="text-[10px] text-gray-400 truncate mt-0.5 max-w-[240px]">
                          {t.address}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
