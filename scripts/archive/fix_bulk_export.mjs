import fs from 'fs';

let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

const exportLogic = `  const handleBulkExport = () => {
    if (selectedIds.length === 0) return;
    const selectedSubs = subscribers.filter(s => selectedIds.includes(s.id));
    const csvContent = [
      ['ID', 'Name', 'Phone', 'Meter Number', 'Zone', 'Status', 'Tariff Type', 'Current Balance', 'Created At'],
      ...selectedSubs.map(s => [s.id, s.name, s.phone, s.meterNumber, s.zone, s.status, s.tariffType, s.currentBalance, s.createdAt])
    ].map(e => e.join(",")).join("\\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', \`subscribers_export_\${new Date().toISOString().split('T')[0]}.csv\`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
`;

content = content.replace(
  /const deleteSubscriber = \(id: string, name: string\) => \{/,
  exportLogic + "\\n  const deleteSubscriber = (id: string, name: string) => {"
);

const oldBulkBtns = `<button 
            disabled={selectedIds.length === 0}
            onClick={() => alert('تم جدولة رسائل التذكير بنجاح')}
            className="text-[10px] px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md hover:bg-cyan-500/20 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            رسالة تذكير
          </button>`;

const newBulkBtns = `<button 
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
          >
            <Download className="w-3 h-3" />
            تصدير CSV
          </button>`;

content = content.replace(oldBulkBtns, newBulkBtns);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);

