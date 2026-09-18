import fs from 'fs';

let content = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');

// The class "right-3" should be "left-3" for RTL.
// The class "pr-10" should be "pl-10" for RTL.
content = content.replace(/pr-10/g, 'pl-10');
content = content.replace(/right-3/g, 'left-3');

fs.writeFileSync('src/components/AdminAccounting.tsx', content);
