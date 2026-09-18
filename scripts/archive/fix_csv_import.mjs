import fs from 'fs';

let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

content = content.replace(
  /const \[subSearch, setSubSearch\] = useState\(''\);/,
  "const fileInputRef = useRef<HTMLInputElement>(null);\n  const [subSearch, setSubSearch] = useState('');"
);

const handleFileUpload = `  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\\n');
      if (lines.length <= 1) return; // Empty or just headers

      const newSubs: typeof subscribers = [];
      // Skip header line [0]
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',');
        if (cols.length < 5) continue; // Basic validation

        // Assumed CSV format: Name, Phone, MeterNumber, Zone, TariffType
        const sub = {
          id: \`sub-\${Date.now()}-\${i}\`,
          name: cols[0]?.trim() || 'غير معروف',
          phone: cols[1]?.trim() || '',
          meterNumber: cols[2]?.trim() || \`M-\${Math.floor(Math.random() * 10000)}\`,
          zone: cols[3]?.trim() || 'المنطقة (أ) - وسط المدينة',
          tariffType: (cols[4]?.trim() as any) || 'residential',
          status: 'active' as const,
          openingBalance: 0,
          currentBalance: 0,
          createdAt: new Date().toISOString()
        };
        newSubs.push(sub);
      }

      if (newSubs.length > 0) {
        onUpdateSubscribers([...subscribers, ...newSubs]);
        onAddAuditLog({
          id: \`log-\${Date.now()}\`,
          userId: currentUser.id,
          username: currentUser.username,
          action: 'استيراد مشتركين',
          details: \`تم استيراد \${newSubs.length} مشترك من ملف CSV\`,
          timestamp: new Date().toISOString()
        });
        alert(\`تم استيراد \${newSubs.length} مشترك بنجاح\`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };`;

content = content.replace(
  /const deleteSubscriber = \(id: string, name: string\) => \{/,
  handleFileUpload + '\n\n  const deleteSubscriber = (id: string, name: string) => {'
);

const oldButtons = `<button
          onClick={() => setShowAddSubModal(true)}
          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مشترك جديد للمحطة</span>
        </button>`;

const newButtons = `<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowAddSubModal(true)}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مشترك جديد</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>استيراد CSV</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv" 
            className="hidden" 
          />
        </div>`;

content = content.replace(oldButtons, newButtons);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);

