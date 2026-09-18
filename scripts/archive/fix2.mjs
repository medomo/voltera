import fs from 'fs';
const files = ['AdminAccounting.tsx', 'AdminOperations.tsx', 'AdminRoles.tsx'];
files.forEach(f => {
  let p = 'src/components/' + f;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/      {showAddEmployee && \(/, '      <AnimatePresence>\n      {showAddEmployee && (');
  c = c.replace(/      {showAddRequest && \(/, '      <AnimatePresence>\n      {showAddRequest && (');
  c = c.replace(/      {showAddRole && \(/, '      <AnimatePresence>\n      {showAddRole && (');
  c = c.replace(/      {showAddExpenseModal && \(/, '      <AnimatePresence>\n      {showAddExpenseModal && (');
  c = c.replace(/      <\/AnimatePresence>\n/g, '      </AnimatePresence>\n');
  fs.writeFileSync(p, c);
});
