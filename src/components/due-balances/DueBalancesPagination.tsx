import React from 'react';
import { 
  ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, 
  ListFilter, Sparkles 
} from 'lucide-react';

interface DueBalancesPaginationProps {
  totalItems: number;
  pageSize: number | 'all';
  currentPage: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number | 'all') => void;
  className?: string;
}

export const DueBalancesPagination: React.FC<DueBalancesPaginationProps> = ({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  className = ''
}) => {
  if (totalItems === 0) return null;

  const effectivePageSize = pageSize === 'all' ? totalItems : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const safePage = Math.min(currentPage, totalPages - 1);
  const startItem = safePage * (typeof pageSize === 'number' ? pageSize : totalItems) + 1;
  const endItem = Math.min(startItem + (typeof pageSize === 'number' ? pageSize : totalItems) - 1, totalItems);

  // Generate page numbers to display around the current page
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    const pages: (number | 'ellipsis')[] = [];
    if (safePage <= 2) {
      pages.push(0, 1, 2, 'ellipsis', totalPages - 1);
    } else if (safePage >= totalPages - 3) {
      pages.push(0, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1);
    } else {
      pages.push(0, 'ellipsis', safePage - 1, safePage, safePage + 1, 'ellipsis', totalPages - 1);
    }
    return pages;
  };

  return (
    <div 
      id="due-balances-pagination-bar"
      className={`p-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden ${className}`}
    >
      {/* Items Range & Total Count Indicator */}
      <div className="flex items-center gap-2 text-slate-300">
        <span className="font-bold text-slate-400">عرض:</span>
        <span className="font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
          {startItem.toLocaleString()} - {endItem.toLocaleString()}
        </span>
        <span className="text-slate-400">من أصل</span>
        <span className="font-mono font-black text-white">{totalItems.toLocaleString()} مشترك</span>
      </div>

      {/* Center Pagination Navigation Controls */}
      {pageSize !== 'all' && totalPages > 1 && (
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-xs">
          {/* First Page button (RTL: ChevronsRight goes to page 0) */}
          <button
            type="button"
            onClick={() => onPageChange(0)}
            disabled={safePage === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors cursor-pointer"
            title="الصفحة الأولى"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>

          {/* Previous Page button (RTL: ChevronRight goes to prev) */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors cursor-pointer"
            title="الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Page Number Buttons */}
          <div className="flex items-center gap-1 px-1">
            {getPageNumbers().map((p, idx) => {
              if (p === 'ellipsis') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1 text-slate-600 font-mono select-none">
                    •••
                  </span>
                );
              }
              const isCurrent = p === safePage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[28px] h-7 px-1.5 rounded-lg font-mono text-xs font-black transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {p + 1}
                </button>
              );
            })}
          </div>

          {/* Next Page button (RTL: ChevronLeft goes to next) */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages - 1, safePage + 1))}
            disabled={safePage >= totalPages - 1}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors cursor-pointer"
            title="الصفحة التالية"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Last Page button (RTL: ChevronsLeft goes to last page) */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={safePage >= totalPages - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-colors cursor-pointer"
            title="الصفحة الأخيرة"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Size Selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="due-balances-page-size" className="text-slate-400 text-xs font-bold hidden sm:inline">
          العدد بكل صفحة:
        </label>
        <select
          id="due-balances-page-size"
          value={pageSize}
          onChange={(e) => {
            const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
            onPageSizeChange(val);
          }}
          className="bg-slate-900 border border-slate-800 text-amber-400 font-mono font-bold rounded-xl px-2.5 py-1.5 outline-none focus:border-amber-500 cursor-pointer text-xs"
        >
          <option value={15}>15 مشترك</option>
          <option value={25}>25 مشترك (سريع)</option>
          <option value={50}>50 مشترك</option>
          <option value={100}>100 مشترك</option>
          <option value={200}>200 مشترك</option>
          <option value="all">عرض الكل في صفحة واحدة</option>
        </select>
      </div>
    </div>
  );
};
