import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');
content = content.replace(
  /ChevronLeft, ChevronRight, BarChart3, AlertTriangle, Send\} from 'lucide-react';/,
  "ChevronLeft, ChevronRight, BarChart3, AlertTriangle, Send, Download} from 'lucide-react';"
);
fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
