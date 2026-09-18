import fs from 'fs';

let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

content = content.replace(
  /const itemsPerPage = 20;/g,
  'const [itemsPerPage, setItemsPerPage] = useState(50);'
);

// We need to also add setItemsPerPage to the dependency array of the paginatedSubscribers if needed?
// useMemo is used with [filteredSubscribers, currentPage], it needs itemsPerPage as well.
content = content.replace(
  /\}, \[filteredSubscribers, currentPage\]\);/g,
  '}, [filteredSubscribers, currentPage, itemsPerPage]);'
);

const oldPagination = `{totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-300 px-3">
            صفحة {currentPage} من {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}`;

const newPagination = `<div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>إظهار</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
          <span>مشترك</span>
          <span className="px-2 border-r border-slate-700">إجمالي: {filteredSubscribers.length}</span>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-300 px-3 font-medium">
              صفحة <span className="text-white">{currentPage}</span> من {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>`;

content = content.replace(oldPagination, newPagination);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);

