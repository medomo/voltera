import fs from 'fs';

let content = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');
content = content.replace(/useState<Partial<Purchase>>\(\{\}\);/, "useState<Partial<Purchase>>({ date: new Date().toISOString().split('T')[0] });");
content = content.replace(/useState<Partial<ServiceConnection>>\(\{ status: 'pending' \}\);/, "useState<Partial<ServiceConnection>>({ status: 'pending', date: new Date().toISOString().split('T')[0] });");
content = content.replace(/useState<Partial<EmployeeTransaction>>\(\{ type: 'salary' \}\);/, "useState<Partial<EmployeeTransaction>>({ type: 'salary', date: new Date().toISOString().split('T')[0] });");
fs.writeFileSync('src/components/AdminAccounting.tsx', content);

let hrContent = fs.readFileSync('src/components/AdminHR.tsx', 'utf8');
hrContent = hrContent.replace(/useState<Partial<EmployeeTransaction>>\(\{ type: 'salary' \}\);/, "useState<Partial<EmployeeTransaction>>({ type: 'salary', date: new Date().toISOString().split('T')[0] });");
fs.writeFileSync('src/components/AdminHR.tsx', hrContent);
