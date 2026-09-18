import fs from 'fs';
const files = ['AdminAccounting.tsx', 'AdminHR.tsx', 'AdminInventory.tsx', 'AdminOperations.tsx', 'AdminRoles.tsx'];
files.forEach(f => {
  let p = 'src/components/' + f;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/      <\/AnimatePresence>\n      <\/>, document\.body\)}/g, '      </AnimatePresence>');
  c = c.replace(/      <\/>, document\.body\)}/g, '      </AnimatePresence>');
  fs.writeFileSync(p, c);
});
