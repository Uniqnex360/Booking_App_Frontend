import React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AdminSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onClear?: () => void;
  placeholder?: string;
  isSearching?: boolean;
  className?: string;
  inputClassName?: string;
}

export function AdminSearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  isSearching = false,
  className = '',
  inputClassName = '',
}: AdminSearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (onClear) onClear();
      else onChange('');
    }
  };

  const handleClear = () => {
    if (onClear) onClear();
    else onChange('');
  };

  return (
    <div className={`relative flex-1 min-w-[200px] ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`pl-10 pr-9 bg-gray-50/80 hover:bg-white focus:bg-white border-gray-200 focus:border-orange-500 text-gray-900 placeholder:text-gray-400 rounded-xl text-xs sm:text-sm h-10 transition shadow-2xs ${inputClassName}`}
      />
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {isSearching && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
        )}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition cursor-pointer"
            title="Clear search (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

