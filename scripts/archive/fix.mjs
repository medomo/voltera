import fs from 'fs';
const files = ['AdminInventory.tsx', 'AdminAccounting.tsx', 'AdminHR.tsx', 'AdminOperations.tsx', 'AdminRoles.tsx'];
files.forEach(f => {
  let p = 'src/components/' + f;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/{typeof document !== 'undefined' && createPortal\(<>\n/g, '');
  c = c.replace(/      <\/AnimatePresence>\n      <\/>, document\.body\)}\n/g, '      </AnimatePresence>\n');
  fs.writeFileSync(p, c);
});
