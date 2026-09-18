import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');
content = content.replace(/Send\}/, 'Send, Download}');
fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
