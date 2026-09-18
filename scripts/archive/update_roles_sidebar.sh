cat << 'INNER_EOF' > roles_sidebar_chunk.tsx
                <button
                  onClick={() => { setActiveSection('admin-system'); setSidebarOpen(false); }}
                  className={`flex items-center justify-end gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeSection === 'admin-system'
                      ? 'bg-amber-500/15 text-amber-400 font-bold border-r-2 border-amber-400 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>بوابة الإدارة الشاملة</span>
                  <Globe className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                </button>
                <button
                  onClick={() => { setActiveSection('roles'); setSidebarOpen(false); }}
                  className={`flex items-center justify-end gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeSection === 'roles'
                      ? 'bg-amber-500/15 text-amber-400 font-bold border-r-2 border-amber-400 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>صلاحيات المستخدمين</span>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                </button>
INNER_EOF
sed -i -e '/<button/,/<\/button>/{ /setActiveSection('\''admin-system'\''/b end_sub; b; :end_sub; /<\/button>/!{N; b end_sub}; r roles_sidebar_chunk.tsx' -e 'd }' src/components/AdminDashboard.tsx
