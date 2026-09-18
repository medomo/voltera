import fs from 'fs';
const files = ['AdminHR.tsx', 'AdminInventory.tsx'];
files.forEach(f => {
  let p = 'src/components/' + f;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/      {showAddEmployee && \(/, '      <AnimatePresence>\n      {showAddEmployee && (');
  c = c.replace(/      {showAddItemModal && \(/, '      <AnimatePresence>\n      {showAddItemModal && (');
  fs.writeFileSync(p, c);
});
