import fs from 'fs';
let content = fs.readFileSync('vite.config.ts', 'utf8');

content = content.replace(
  /plugins: \[react\(\), tailwindcss\(\)\],/g,
  "plugins: [react(), tailwindcss()],\n    define: {\n      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || '')\n    },"
);

fs.writeFileSync('vite.config.ts', content);
