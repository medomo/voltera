import fs from 'fs';

let content = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');

// For Employee Tx
content = content.replace(
  /employeeTxs, 'employee_transactions'/g,
  `employeeTxs.map(tx => ({...tx, type: tx.type === 'salary' ? 'راتب' : tx.type === 'advance' ? 'سلفة' : 'بدل'})), 'employee_transactions'`
);
content = content.replace(
  /'السلف والرواتب', employeeTxs,/g,
  `'السلف والرواتب', employeeTxs.map(tx => ({...tx, type: tx.type === 'salary' ? 'راتب' : tx.type === 'advance' ? 'سلفة' : 'بدل'})),`
);

// For Connections
content = content.replace(
  /connections, 'connections'/g,
  `connections.map(c => ({...c, status: c.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'})), 'connections'`
);
content = content.replace(
  /'إيرادات إدخال خدمة الكهرباء', connections,/g,
  `'إيرادات إدخال خدمة الكهرباء', connections.map(c => ({...c, status: c.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'})),`
);

fs.writeFileSync('src/components/AdminAccounting.tsx', content);
