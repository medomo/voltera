import fs from 'fs';
const files = ['AdminHR.tsx', 'AdminOperations.tsx'];
files.forEach(f => {
  let p = 'src/components/' + f;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/      <AnimatePresence>\n        <AnimatePresence>\n/g, '      <AnimatePresence>\n');
  c = c.replace(/      <AnimatePresence>\n      <AnimatePresence>\n/g, '      <AnimatePresence>\n');
  fs.writeFileSync(p, c);
});
