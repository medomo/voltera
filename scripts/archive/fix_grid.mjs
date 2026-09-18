import fs from 'fs';
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

content = content.replace(
  /<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">\s*<RevenueExpenseChart data=\{revExpData\} currency=\{settings\.currency\} \/>\s*<FinancialAreaChart data=\{financialChartData\} currency=\{settings\.currency\} \/>\s*<ZoneBarChart data=\{zoneChartData\} \/>\s*<\/div>/g,
  `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RevenueExpenseChart data={revExpData} currency={settings.currency} />
                  <FinancialAreaChart data={financialChartData} currency={settings.currency} />
                  <div className="lg:col-span-2">
                    <ZoneBarChart data={zoneChartData} />
                  </div>
                </div>`
);
fs.writeFileSync('src/components/AdminDashboard.tsx', content);
