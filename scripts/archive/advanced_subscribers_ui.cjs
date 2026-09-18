const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const targetStr = `                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <button
                    onClick={() => setShowAddSubModal(true)}
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة مشترك جديد للمحطة</span>
                  </button>
                  {/* Search Bar */}
                  <div className="relative w-full sm:max-w-md">
                    <input
                      type="text"
                      placeholder="البحث في المشتركين بالاسم، العداد، الجوال..."
                      value={subSearch}
                      onChange={e => setSubSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 pr-9 text-slate-200 text-right text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                  </div>
                </div>

                {/* Subscribers Master Table */}
                <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-sans">
                        <th className="p-4 font-bold">المشترك</th>
                        <th className="p-4 font-bold">رقم الهاتف</th>
                        <th className="p-4 font-bold">المنطقة والمحول</th>
                        <th className="p-4 font-bold text-center">التعرفة</th>
                        <th className="p-4 font-bold text-center">القراءة الحالية</th>
                        <th className="p-4 font-bold text-center">الرصيد المستحق</th>
                        <th className="p-4 font-bold text-center">الحالة</th>
                        <th className="p-4 font-bold text-center">العمليات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredSubscribers.map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-900/20 transition-all">
                          <td className="p-4">
                            <span className="block font-bold text-slate-200">{sub.name}</span>
                            <span className="block text-[10px] text-amber-500 font-mono mt-0.5">{sub.meterNumber}</span>
                          </td>
                          <td className="p-4 font-mono text-slate-300">{sub.phone}</td>
                          <td className="p-4">
                            <span className="block font-bold text-slate-300">{sub.zone.replace('المنطقة ', '')}</span>
                            <span className="block text-[10px] text-slate-400">{sub.transformer || 'بدون محول'}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="px-2 py-0.5 bg-slate-950 rounded-md text-[10px] text-slate-300 border border-slate-800">
                              {sub.tariffType === 'residential' ? 'سكني' : sub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono text-slate-200">{sub.currentReading} ك.و</td>
                          <td className={\`p-4 text-center font-mono font-bold \${sub.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}\`}>
                            {sub.currentBalance.toLocaleString()} {settings.currency}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => toggleSubStatus(sub)}
                              className={\`px-2 py-1 rounded-md text-[10px] font-bold transition-all \${
                                sub.status === 'active' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20' 
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                              }\`}
                              title="اضغط لتغيير الحالة"
                            >
                              {sub.status === 'active' ? 'نشط' : 'موقف'}
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedSubForLedger(sub)}
                                className="bg-slate-950 hover:bg-slate-900 text-cyan-400 border border-slate-800 p-1.5 rounded-lg transition-all"
                                title="كشف الحساب والعمليات التاريخية"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingSub(sub)}
                                className="bg-slate-950 hover:bg-slate-900 text-amber-400 border border-slate-800 p-1.5 rounded-lg transition-all"
                                title="تعديل"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteSubscriber(sub.id, sub.name)}
                                className="bg-slate-950 hover:bg-rose-950/40 text-rose-400 border border-slate-800 hover:border-rose-500/30 p-1.5 rounded-lg transition-all"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>`;

const advancedUI = `
                {/* Advanced Subscribers Dashboard Header */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                        <div className="text-2xl font-black text-white">{subscribers.length}</div>
                        <div className="text-xs text-slate-400 mt-1 font-bold">إجمالي المشتركين</div>
                    </div>
                    <div className="bg-emerald-900/20 border border-emerald-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                        <div className="text-2xl font-black text-emerald-400">{subscribers.filter(s => s.status === 'active').length}</div>
                        <div className="text-xs text-emerald-500/70 mt-1 font-bold">مشترك نشط</div>
                    </div>
                    <div className="bg-rose-900/20 border border-rose-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                        <div className="text-2xl font-black text-rose-400">{subscribers.filter(s => s.status === 'inactive').length}</div>
                        <div className="text-xs text-rose-500/70 mt-1 font-bold">مشترك موقف</div>
                    </div>
                    <div className="bg-amber-900/20 border border-amber-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                        <div className="text-2xl font-black text-amber-400 font-mono">{subscribers.reduce((sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0), 0).toLocaleString()}</div>
                        <div className="text-xs text-amber-500/70 mt-1 font-bold">إجمالي الديون ({settings.currency})</div>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <button
                      onClick={() => setShowAddSubModal(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>مشترك جديد</span>
                    </button>
                    
                    <div className="h-8 w-px bg-slate-800 hidden sm:block mx-1"></div>

                    {/* View Toggles */}
                    <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-800">
                        <button 
                            onClick={() => setSubscriberViewMode('table')}
                            className={\`p-1.5 rounded-md transition-all \${subscriberViewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}\`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                        </button>
                        <button 
                            onClick={() => setSubscriberViewMode('grid')}
                            className={\`p-1.5 rounded-md transition-all \${subscriberViewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}\`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-800 hidden sm:block mx-1"></div>

                    {/* Filters */}
                    <select 
                        value={subscriberFilterZone}
                        onChange={(e) => setSubscriberFilterZone(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500"
                    >
                        <option value="all">كل المناطق</option>
                        {Array.from(new Set(subscribers.map(s => s.zone))).map(z => (
                            <option key={z} value={z}>{z}</option>
                        ))}
                    </select>

                    <select 
                        value={subscriberFilterStatus}
                        onChange={(e) => setSubscriberFilterStatus(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500"
                    >
                        <option value="all">كل الحالات</option>
                        <option value="active">نشط فقط</option>
                        <option value="inactive">موقف فقط</option>
                    </select>

                    <select 
                        value={subscriberFilterTariff}
                        onChange={(e) => setSubscriberFilterTariff(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500"
                    >
                        <option value="all">كل التعرفات</option>
                        <option value="residential">سكني</option>
                        <option value="commercial">تجاري</option>
                        <option value="industrial">صناعي</option>
                    </select>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full xl:w-80">
                    <input
                      type="text"
                      placeholder="البحث بالاسم، العداد، الجوال..."
                      value={subSearch}
                      onChange={e => setSubSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 pr-10 text-slate-200 text-right text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>

                {/* Bulk Actions Banner */}
                <AnimatePresence>
                    {selectedSubscribersIds.length > 0 && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 overflow-hidden"
                        >
                            <div className="flex items-center gap-3">
                                <span className="bg-indigo-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">{selectedSubscribersIds.length}</span>
                                <span className="text-indigo-200 text-sm font-bold">مشترك محدد</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleBulkToggleStatus('active')} className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 text-xs py-1.5 px-4 rounded-lg font-bold transition-all">تنشيط المحدد</button>
                                <button onClick={() => handleBulkToggleStatus('inactive')} className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 border border-rose-500/30 text-xs py-1.5 px-4 rounded-lg font-bold transition-all">إيقاف المحدد</button>
                                <div className="w-px h-5 bg-indigo-500/30 mx-1"></div>
                                <button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 text-white text-xs py-1.5 px-4 rounded-lg font-bold transition-all">حذف المحدد</button>
                                <button onClick={() => setSelectedSubscribersIds([])} className="text-indigo-300 hover:text-white text-xs px-2 py-1 underline">إلغاء التحديد</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Subscribers Content View */}
                {subscriberViewMode === 'table' ? (
                    <div className="bg-slate-900/30 rounded-2xl border border-slate-800/80 overflow-x-auto shadow-xl">
                    <table className="w-full text-right text-xs border-collapse">
                        <thead>
                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-sans">
                            <th className="p-4 w-10 text-center">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-950 accent-amber-500 cursor-pointer"
                                    checked={filteredSubscribers.length > 0 && selectedSubscribersIds.length === filteredSubscribers.length}
                                    onChange={toggleAllSubscribersSelection}
                                />
                            </th>
                            <th className="p-4 font-bold">المشترك</th>
                            <th className="p-4 font-bold">رقم الهاتف</th>
                            <th className="p-4 font-bold">المنطقة والمحول</th>
                            <th className="p-4 font-bold text-center">التعرفة</th>
                            <th className="p-4 font-bold text-center">القراءة الحالية</th>
                            <th className="p-4 font-bold text-center">الرصيد المستحق</th>
                            <th className="p-4 font-bold text-center">الحالة</th>
                            <th className="p-4 font-bold text-center">العمليات</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                        {filteredSubscribers.map(sub => {
                            const isSelected = selectedSubscribersIds.includes(sub.id);
                            return (
                            <tr key={sub.id} className={\`transition-all \${isSelected ? 'bg-indigo-900/20' : 'hover:bg-slate-900/40'}\`}>
                            <td className="p-4 text-center">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-950 accent-amber-500 cursor-pointer"
                                    checked={isSelected}
                                    onChange={() => toggleSubscriberSelection(sub.id)}
                                />
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={\`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 \${sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}\`}>
                                        {sub.name.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="block font-bold text-slate-200">{sub.name}</span>
                                        <span className="block text-[10px] text-amber-500 font-mono mt-0.5">{sub.meterNumber}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 font-mono text-slate-300">{sub.phone}</td>
                            <td className="p-4">
                                <span className="block font-bold text-slate-300">{sub.zone.replace('المنطقة ', '')}</span>
                                <span className="block text-[10px] text-slate-400">{sub.transformer || 'بدون محول'}</span>
                            </td>
                            <td className="p-4 text-center">
                                <span className="px-2 py-1 bg-slate-950 rounded-md text-[10px] text-slate-300 border border-slate-800">
                                {sub.tariffType === 'residential' ? 'سكني' : sub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}
                                </span>
                            </td>
                            <td className="p-4 text-center font-mono text-slate-200">{sub.currentReading} ك.و</td>
                            <td className={\`p-4 text-center font-mono font-bold \${sub.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}\`}>
                                {sub.currentBalance.toLocaleString()} {settings.currency}
                            </td>
                            <td className="p-4 text-center">
                                <button
                                onClick={() => toggleSubStatus(sub)}
                                className={\`px-2 py-1 rounded-md text-[10px] font-bold transition-all \${
                                    sub.status === 'active' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20' 
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                                }\`}
                                title="اضغط لتغيير الحالة"
                                >
                                {sub.status === 'active' ? 'نشط' : 'موقف'}
                                </button>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setSelectedSubForLedger(sub)}
                                    className="bg-slate-950 hover:bg-slate-900 text-cyan-400 border border-slate-800 p-1.5 rounded-lg transition-all"
                                    title="كشف الحساب والعمليات التاريخية"
                                >
                                    <FileText className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setEditingSub(sub)}
                                    className="bg-slate-950 hover:bg-slate-900 text-amber-400 border border-slate-800 p-1.5 rounded-lg transition-all"
                                    title="تعديل"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => deleteSubscriber(sub.id, sub.name)}
                                    className="bg-slate-950 hover:bg-rose-950/40 text-rose-400 border border-slate-800 hover:border-rose-500/30 p-1.5 rounded-lg transition-all"
                                    title="حذف"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                </div>
                            </td>
                            </tr>
                        )})}
                        {filteredSubscribers.length === 0 && (
                            <tr>
                                <td colSpan={9} className="p-8 text-center text-slate-500">لا يوجد مشتركين يطابقون معايير البحث</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredSubscribers.map(sub => {
                            const isSelected = selectedSubscribersIds.includes(sub.id);
                            return (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                key={sub.id} 
                                className={\`relative bg-slate-900/50 rounded-2xl border transition-all overflow-hidden shadow-lg \${isSelected ? 'border-indigo-500 shadow-indigo-500/10' : 'border-slate-800 hover:border-slate-700'}\`}
                            >
                                <div className={\`absolute top-0 right-0 w-full h-1 \${sub.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}\`}></div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-950 accent-amber-500 cursor-pointer"
                                                checked={isSelected}
                                                onChange={() => toggleSubscriberSelection(sub.id)}
                                            />
                                            <div>
                                                <h4 className="font-bold text-slate-200 text-sm">{sub.name}</h4>
                                                <div className="text-xs font-mono text-amber-500 mt-1">{sub.meterNumber}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleSubStatus(sub)}
                                            className={\`px-2 py-1 rounded-md text-[10px] font-bold transition-all \${
                                                sub.status === 'active' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400' 
                                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-emerald-500/10 hover:text-emerald-400'
                                            }\`}
                                            >
                                            {sub.status === 'active' ? 'نشط' : 'موقف'}
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs mb-5 p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
                                        <div>
                                            <div className="text-slate-500 mb-1">رقم الهاتف</div>
                                            <div className="font-mono text-slate-300">{sub.phone}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-500 mb-1">المنطقة</div>
                                            <div className="text-slate-300 truncate" title={sub.zone}>{sub.zone.replace('المنطقة ', '')}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-500 mb-1">القراءة</div>
                                            <div className="font-mono text-cyan-400">{sub.currentReading} ك.و</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-500 mb-1">الرصيد</div>
                                            <div className={\`font-mono font-bold \${sub.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}\`}>
                                                {sub.currentBalance.toLocaleString()} {settings.currency}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-4 mt-auto">
                                        <button
                                            onClick={() => setSelectedSubForLedger(sub)}
                                            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 py-1.5 rounded-lg transition-all text-xs font-bold"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>كشف الحساب</span>
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingSub(sub)}
                                                className="bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 p-1.5 rounded-lg transition-all"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => deleteSubscriber(sub.id, sub.name)}
                                                className="bg-slate-950 hover:bg-rose-950/40 text-rose-400 border border-slate-800 hover:border-rose-500/30 p-1.5 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )})}
                        {filteredSubscribers.length === 0 && (
                            <div className="col-span-full p-12 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
                                لا يوجد مشتركين يطابقون معايير البحث
                            </div>
                        )}
                    </div>
                )}`;

if (code.includes('<table className="w-full text-right text-xs border-collapse">')) {
  code = code.replace(targetStr, advancedUI);
  fs.writeFileSync('src/components/AdminDashboard.tsx', code);
  console.log('UI updated.');
} else {
  console.log('Target string not found.');
}
