import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

// Ensure import of SubscribersMap
if (!content.includes('SubscribersMap')) {
  content = content.replace(
    /import \{ Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid \} from 'recharts';/,
    "import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';\nimport { SubscribersMap } from './SubscribersMap';"
  );
}

// Add map toggle button
const advancedFilters = `      {/* Advanced Filters & Bulk Actions */}
      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 flex flex-col xl:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-3">`;
        
const newFilters = `      {/* Advanced Filters & Bulk Actions */}
      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 flex flex-col xl:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('list')}
              className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all \${viewMode === 'list' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}\`}
            >
              <List className="w-3.5 h-3.5" />
              قائمة
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all \${viewMode === 'map' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}\`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              خريطة
            </button>
          </div>
          <div className="w-px h-6 bg-slate-800 mx-1"></div>`;

content = content.replace(advancedFilters, newFilters);

// Render map or table based on viewMode
const tableSection = `{/* Subscribers Master Table */}
      <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 overflow-x-auto relative">`;

const newTableSection = `{viewMode === 'map' ? (
        <SubscribersMap subscribers={filteredSubscribers} />
      ) : (
      <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 overflow-x-auto relative">`;

content = content.replace(tableSection, newTableSection);

// Close the wrapper
const paginationSection = `      <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">`;
const newPaginationSection = `      )}
      {viewMode === 'list' && (
      <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">`;
      
content = content.replace(paginationSection, newPaginationSection);

const endOfPagination = `            </button>
          </div>
        </div>
      </div>

      {/* Comprehensive Subscriber Profile Drawer (ملف شامل) */}`;

const newEndOfPagination = `            </button>
          </div>
        </div>
      </div>
      )}

      {/* Comprehensive Subscriber Profile Drawer (ملف شامل) */}`;

content = content.replace(endOfPagination, newEndOfPagination);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
