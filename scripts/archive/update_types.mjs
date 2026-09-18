import fs from 'fs';
let content = fs.readFileSync('src/types.ts', 'utf8');
content = content.replace(
  /currentBalance: number; \/\/ Positive is debt\/due, negative is credit/g,
  "currentBalance: number; // Positive is debt/due, negative is credit\n  coordinates?: { lat: number; lng: number };"
);
fs.writeFileSync('src/types.ts', content);
