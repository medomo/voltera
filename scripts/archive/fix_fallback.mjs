import fs from 'fs';

let content = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');
const search = `  const [employees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('voltera_employees');
    return saved ? JSON.parse(saved) : [];
  });`;

const replacement = `  const [employees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('voltera_employees');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'المهندس أحمد صالح', role: 'engineer', phone: '0599112233', salary: 150000, status: 'active', joinDate: '2023-01-15' },
      { id: '2', name: 'الفني محمد علي', role: 'technician', phone: '0599445566', salary: 90000, status: 'active', joinDate: '2023-03-01' },
      { id: '3', name: 'المحاسب خالد حسن', role: 'accountant', phone: '0599778899', salary: 120000, status: 'active', joinDate: '2023-05-20' },
    ];
  });`;

content = content.replace(search, replacement);
fs.writeFileSync('src/components/AdminAccounting.tsx', content);

