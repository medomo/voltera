cat << 'INNER_EOF' > sidebar_chunk.tsx
            <button
              onClick={() => { setActiveSection('subscribers'); setSidebarOpen(false); }}
              className={`flex items-center justify-end gap-3 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeSection === 'subscribers'
                  ? 'bg-slate-800 text-white font-bold border-r-4 border-yellow-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>إدارة ملفات المشتركين</span>
              <Users className="w-4 h-4 shrink-0" />
            </button>
            <button
              onClick={() => { setActiveSection('reports'); setSidebarOpen(false); }}
              className={`flex items-center justify-end gap-3 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeSection === 'reports'
                  ? 'bg-slate-800 text-white font-bold border-r-4 border-yellow-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>التقارير المتقدمة</span>
              <BarChart3 className="w-4 h-4 shrink-0" />
            </button>
            <button
              onClick={() => { setActiveSection('debt'); setSidebarOpen(false); }}
              className={`flex items-center justify-end gap-3 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeSection === 'debt'
                  ? 'bg-slate-800 text-white font-bold border-r-4 border-yellow-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>إدارة الديون والمتأخرات</span>
              <Banknote className="w-4 h-4 shrink-0" />
            </button>
            <button
              onClick={() => { setActiveSection('zones'); setSidebarOpen(false); }}
              className={`flex items-center justify-end gap-3 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeSection === 'zones'
                  ? 'bg-slate-800 text-white font-bold border-r-4 border-yellow-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>المناطق والمحولات</span>
              <Map className="w-4 h-4 shrink-0" />
            </button>
INNER_EOF
sed -i -e '/<button/,/<\/button>/{ /setActiveSection('\''subscribers'\''/b end_sub; b; :end_sub; /<\/button>/!{N; b end_sub}; r sidebar_chunk.tsx' -e 'd }' src/components/AdminDashboard.tsx
