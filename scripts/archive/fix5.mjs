import fs from 'fs';
const files = ['AdminAccounting.tsx', 'AdminHR.tsx', 'AdminInventory.tsx', 'AdminOperations.tsx', 'AdminRoles.tsx'];
files.forEach(f => {
  let p = 'src/components/' + f;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/            <\/motion\.div>\n      <\/AnimatePresence>/g, '            </motion.div>\n          </div>\n      </AnimatePresence>');
  c = c.replace(/      <AnimatePresence>\n      <AnimatePresence>/g, '      <AnimatePresence>');
  fs.writeFileSync(p, c);
});
