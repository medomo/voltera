import fs from 'fs';
let content = fs.readFileSync('src/components/SubscribersMap.tsx', 'utf8');

content = content.replace(
  /function MarkerWithInfoWindow\(\{ sub \}: \{ sub: Subscriber \}\) \{/,
  "function MarkerWithInfoWindow({ sub }: { sub: Subscriber; key?: React.Key }) {"
);

fs.writeFileSync('src/components/SubscribersMap.tsx', content);
