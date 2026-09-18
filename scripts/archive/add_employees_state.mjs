import fs from 'fs';

let content = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');

const injection = `  const [employees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('voltera_employees');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] =`;

content = content.replace("  const [expenses, setExpenses] =", injection);

fs.writeFileSync('src/components/AdminAccounting.tsx', content);
