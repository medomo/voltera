import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

content = content.replace(
  /import \{\s*FinancialAreaChart, ZoneBarChart\s*\} from '.\/StatsCharts';/,
  "import { FinancialAreaChart, ZoneBarChart, RevenueExpenseChart } from './StatsCharts';"
);

// We need to define localStorage reads for expenses, purchases, employeeTxs, connections inside AdminDashboard component.
const localStorageLoads = `
  const [expenses] = useState<any[]>(() => {
    const saved = localStorage.getItem('voltera_expenses');
    return saved ? JSON.parse(saved) : [];
  });
  const [purchases] = useState<any[]>(() => {
    const saved = localStorage.getItem('voltera_purchases');
    return saved ? JSON.parse(saved) : [];
  });
  const [employeeTxs] = useState<any[]>(() => {
    const saved = localStorage.getItem('voltera_employeeTxs');
    return saved ? JSON.parse(saved) : [];
  });
  const [connections] = useState<any[]>(() => {
    const saved = localStorage.getItem('voltera_connections');
    return saved ? JSON.parse(saved) : [];
  });
`;

content = content.replace(
  /export const AdminDashboard: React.FC<AdminDashboardProps> = \(\{([^}]*)\}\) => \{/,
  "export const AdminDashboard: React.FC<AdminDashboardProps> = ({$1}) => {" + localStorageLoads
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);

