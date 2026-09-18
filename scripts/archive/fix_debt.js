const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDebt.tsx', 'utf8');
content = content.replace(
  /<button className="p-1.5 bg-slate-800 text-sky-400 hover:text-white rounded-lg transition-colors" title="إرسال رسالة تذكير">\s*<Phone className="w-4 h-4" \/>\s*<\/button>/g,
  `<a href={\`tel:\${s.phone}\`} className="p-1.5 bg-slate-800 text-sky-400 hover:text-white rounded-lg transition-colors block cursor-pointer" title="اتصال بالمشترك">
                            <Phone className="w-4 h-4" />
                          </a>`
);
fs.writeFileSync('src/components/AdminDebt.tsx', content);
