const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

if (!code.includes('Wrench,')) {
  code = code.replace('lucide-react\';', 'Wrench } from \'lucide-react\';');
  fs.writeFileSync('src/components/AdminDashboard.tsx', code);
}
