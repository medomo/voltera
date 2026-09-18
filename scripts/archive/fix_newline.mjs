import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');
content = content.replace(/\\n  const deleteSubscriber =/g, '\n  const deleteSubscriber =');
fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
