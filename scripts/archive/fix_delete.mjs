import fs from 'fs';

let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

const oldDelete = `  const deleteSubscriber = (id: string, name: string) => {
    if (window.confirm(\`هل أنت متأكد من حذف المشترك \${name}؟\`)) {
      onUpdateSubscribers(subscribers.filter(s => s.id !== id));
      onAddAuditLog({
        id: \`log-\${Date.now()}\`,
        userId: currentUser.id,
        username: currentUser.username,
        action: 'حذف مشترك',
        details: \`حذف المشترك: \${name}\`,
        timestamp: new Date().toISOString()
      });
    }
  };`;

const newDelete = `  const deleteSubscriber = (id: string, name: string) => {
      onUpdateSubscribers(subscribers.filter(s => s.id !== id));
      onAddAuditLog({
        id: \`log-\${Date.now()}\`,
        userId: currentUser.id,
        username: currentUser.username,
        action: 'حذف مشترك',
        details: \`حذف المشترك: \${name}\`,
        timestamp: new Date().toISOString()
      });
  };`;

content = content.replace(oldDelete, newDelete);
fs.writeFileSync('src/components/AdminSubscribers.tsx', content);

