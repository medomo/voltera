import fs from 'fs';

let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

// Add state for filterTariff
content = content.replace(
  /const \[filterDebt, setFilterDebt\] = useState\('all'\);/,
  "const [filterDebt, setFilterDebt] = useState('all');\n  const [filterTariff, setFilterTariff] = useState('all');"
);

// Add logic for filterTariff
content = content.replace(
  /let matchesDebt = true;/,
  `const matchesTariff = filterTariff === 'all' || sub.tariffType === filterTariff;
      let matchesDebt = true;`
);

content = content.replace(
  /return matchesSearch && matchesZone && matchesStatus && matchesDebt;/,
  `return matchesSearch && matchesZone && matchesStatus && matchesTariff && matchesDebt;`
);

content = content.replace(
  /\[subscribers, subSearch, filterZone, filterStatus, filterDebt\]/,
  `[subscribers, subSearch, filterZone, filterStatus, filterTariff, filterDebt]`
);

// Add select dropdown for filterTariff in UI
const oldSelects = `<select 
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
          </select>`;

const newSelects = `<select 
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
          </select>
          <select 
            value={filterTariff}
            onChange={e => { setFilterTariff(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500"
          >
            <option value="all">كل التعرفات</option>
            <option value="residential">منزلي</option>
            <option value="commercial">تجاري</option>
            <option value="industrial">صناعي</option>
          </select>`;

content = content.replace(oldSelects, newSelects);

// Optionally enhance filterDebt with more options if requested
const oldDebtSelect = `<select 
            value={filterDebt}
            onChange={e => { setFilterDebt(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500"
          >
            <option value="all">كل الأرصدة</option>
            <option value="has_debt">عليه مديونية</option>
            <option value="high_debt">مديونية عالية (&gt;10000)</option>
          </select>`;

const newDebtSelect = `<select 
            value={filterDebt}
            onChange={e => { setFilterDebt(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500"
          >
            <option value="all">كل الأرصدة</option>
            <option value="has_debt">عليه مديونية</option>
            <option value="high_debt">مديونية عالية (&gt;10000)</option>
            <option value="critical_debt">مديونية حرجة (&gt;50000)</option>
          </select>`;

content = content.replace(oldDebtSelect, newDebtSelect);

// Add the high_debt and critical_debt filter logic
content = content.replace(
  /if \(filterDebt === 'high_debt'\) matchesDebt = sub.currentBalance > 10000;/,
  `if (filterDebt === 'high_debt') matchesDebt = sub.currentBalance > 10000;
      if (filterDebt === 'critical_debt') matchesDebt = sub.currentBalance > 50000;`
);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);

