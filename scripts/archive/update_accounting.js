const fs = require('fs');
let code = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');

// Replace standard useState with localStorage backed ones
code = code.replace(/const \[expenses\] = useState<Expense\[\]>\(\[/, `
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);

  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: 'وقود (ديزل)' });
  const [newPurchase, setNewPurchase] = useState<Partial<Purchase>>({});
  const [newConnection, setNewConnection] = useState<Partial<ServiceConnection>>({ status: 'pending' });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('voltera_expenses');
    return saved ? JSON.parse(saved) : [`);
    
code = code.replace(/const \[purchases\] = useState<Purchase\[\]>\(\[/, `
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('voltera_purchases');
    return saved ? JSON.parse(saved) : [`);

code = code.replace(/const \[employeeTxs\] = useState<EmployeeTransaction\[\]>\(\[/, `
  const [employeeTxs, setEmployeeTxs] = useState<EmployeeTransaction[]>(() => {
    const saved = localStorage.getItem('voltera_employeeTxs');
    return saved ? JSON.parse(saved) : [`);

code = code.replace(/const \[connections\] = useState<ServiceConnection\[\]>\(\[/, `
  const [connections, setConnections] = useState<ServiceConnection[]>(() => {
    const saved = localStorage.getItem('voltera_connections');
    return saved ? JSON.parse(saved) : [`);

fs.writeFileSync('src/components/AdminAccounting.tsx', code);
