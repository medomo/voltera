import fs from 'fs';

let content = fs.readFileSync('src/components/AdminInventory.tsx', 'utf8');

// replace category translation
content = content.replace(
  /category: item\.category === 'cables' \? 'كابلات' : item\.category === 'transformers' \? 'محولات' : item\.category === 'meters' \? 'عدادات' : item\.category === 'tools' \? 'أدوات' : 'أخرى'/g,
  "category: item.category === 'cables' ? 'كابلات' : item.category === 'breakers' ? 'قواطع' : item.category === 'meters' ? 'عدادات' : item.category === 'oil' ? 'زيوت' : 'أخرى'"
);

fs.writeFileSync('src/components/AdminInventory.tsx', content);

