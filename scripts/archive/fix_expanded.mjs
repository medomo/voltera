import fs from 'fs';

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const search = `  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    subscribers: true,
    finance: true,
    sms: false,
    system: false,
    inventory: false,
    hr: false,
    operations: false,
    reporting: false
  });`;

const replacement = `  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    subscribers: false,
    finance: false,
    sms: false,
    system: false,
    inventory: false,
    hr: false,
    operations: false,
    reporting: false
  });`;

content = content.replace(search, replacement);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);

