import fs from 'fs';
let content = fs.readFileSync('src/initialData.ts', 'utf8');

const regex = /currentBalance: ([\-\d\.]+),/g;
let counter = 0;
content = content.replace(regex, (match, p1) => {
  const lat = 15.3695 + (Math.random() * 0.05 - 0.025);
  const lng = 44.1910 + (Math.random() * 0.05 - 0.025);
  return 'currentBalance: ' + p1 + ', coordinates: { lat: ' + lat.toFixed(5) + ', lng: ' + lng.toFixed(5) + ' },';
});

fs.writeFileSync('src/initialData.ts', content);
