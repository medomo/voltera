import fs from 'fs';

let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

const handleReminder = `  const handleBulkReminder = () => {
    if (selectedIds.length === 0) {
      alert('يرجى تحديد مشترك واحد على الأقل');
      return;
    }
    if (!window.confirm(\`هل أنت متأكد من إرسال رسائل تذكير لـ \${selectedIds.length} مشترك؟\`)) return;
    onAddAuditLog({
      id: \`log-\${Date.now()}\`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'إرسال تذكير',
      details: \`إرسال تذكير بالدفع لـ \${selectedIds.length} مشترك\`,
      timestamp: new Date().toISOString()
    });
    alert('تم جدولة رسائل التذكير بنجاح');
    setSelectedIds([]);
  };`;

content = content.replace(
  /const handleBulkExport = \(\) => \{/,
  handleReminder + '\n\n  const handleBulkExport = () => {'
);

// We need to change handleBulkStatusToggle to handle empty state gracefully
content = content.replace(
  /if \(selectedIds\.length === 0\) return;/,
  "if (selectedIds.length === 0) { alert('يرجى تحديد مشترك واحد على الأقل'); return; }"
);

content = content.replace(
  /const handleBulkExport = \(\) => \{\n    if \(selectedIds\.length === 0\) return;/,
  "const handleBulkExport = () => {\n    if (selectedIds.length === 0) { alert('يرجى تحديد مشترك واحد على الأقل'); return; }"
);

// Replace the buttons
const oldButtons = `<button 
            disabled={selectedIds.length === 0}
            onClick={() => handleBulkStatusToggle('suspended')}
            className="text-[10px] px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
          >
            إيقاف الخدمة
          </button>
          <button 
            disabled={selectedIds.length === 0}
            onClick={() => handleBulkStatusToggle('active')}
            className="text-[10px] px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
          >
            تفعيل الخدمة
          </button>
          <button 
            disabled={selectedIds.length === 0}
            onClick={() => alert('تم جدولة رسائل التذكير بنجاح')}
            className="text-[10px] px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md hover:bg-cyan-500/20 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            رسالة تذكير
          </button>
          <button 
            disabled={selectedIds.length === 0}
            onClick={handleBulkExport}
            className="text-[10px] px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md hover:bg-amber-500/20 disabled:opacity-50 transition-colors flex items-center gap-1"
          >`;

const newButtons = `<button 
            onClick={() => handleBulkStatusToggle('suspended')}
            className={\`text-[10px] px-3 py-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 \${selectedIds.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 hover:shadow-[0_0_10px_rgba(244,63,94,0.2)]'}\`}
          >
            <UserX className="w-3 h-3" />
            إيقاف الخدمة
          </button>
          <button 
            onClick={() => handleBulkStatusToggle('active')}
            className={\`text-[10px] px-3 py-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 \${selectedIds.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]'}\`}
          >
            <CheckCircle2 className="w-3 h-3" />
            تفعيل الخدمة
          </button>
          <button 
            onClick={handleBulkReminder}
            className={\`text-[10px] px-3 py-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 \${selectedIds.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]'}\`}
          >
            <Send className="w-3 h-3" />
            رسالة تذكير
          </button>
          <button 
            onClick={handleBulkExport}
            className={\`text-[10px] px-3 py-1.5 rounded-md transition-all active:scale-95 flex items-center gap-1 \${selectedIds.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]'}\`}
          >`;

content = content.replace(oldButtons, newButtons);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
