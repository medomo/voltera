import fs from 'fs';

let content = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');

// Update lucide-react imports
content = content.replace(
  /import \{\s*Wallet, TrendingDown, Users, Zap, Search, Plus, FileText, ChevronLeft, ChevronDown, Calendar\s*\} from 'lucide-react';/,
  "import { Wallet, TrendingDown, Users, Zap, Search, Plus, FileText, ChevronLeft, ChevronDown, Calendar, Download, Printer } from 'lucide-react';"
);

// Add export utils import
content = content.replace(
  /import \{ Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, CartesianGrid \} from 'recharts';/,
  "import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from 'recharts';\nimport { exportToCSV, printData } from '../utils/exportUtils';"
);

fs.writeFileSync('src/components/AdminAccounting.tsx', content);
