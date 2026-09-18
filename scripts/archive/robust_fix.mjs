import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

const regex = /(<\/div>\s*)\{typeof document !== 'undefined'/;
content = content.replace(regex, "$1</>\n      )}\n{typeof document !== 'undefined'");

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
