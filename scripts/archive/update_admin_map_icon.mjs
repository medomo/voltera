import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

content = content.replace(
  /Send, Download, Upload/g,
  "Send, Download, Upload, Map as MapIcon, List"
);

content = content.replace(
  /const \[subSearch, setSubSearch\] = useState\(''\);/,
  "const [viewMode, setViewMode] = useState<'list' | 'map'>('list');\n  const [subSearch, setSubSearch] = useState('');"
);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
