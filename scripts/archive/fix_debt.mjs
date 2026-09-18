import fs from 'fs';
let content = fs.readFileSync('src/components/AdminDebt.tsx', 'utf8');
const search = '<button className="p-1.5 bg-slate-800 text-sky-400 hover:text-white rounded-lg transition-colors" title="إرسال رسالة تذكير">\n                            <Phone className="w-4 h-4" />\n                          </button>';
const replace = `<a href={\`tel:\${s.phone}\`} className="p-1.5 bg-slate-800 text-sky-400 hover:text-white rounded-lg transition-colors block cursor-pointer" title="اتصال بالمشترك">\n                            <Phone className="w-4 h-4" />\n                          </a>`;
content = content.replace(search, replace);
fs.writeFileSync('src/components/AdminDebt.tsx', content);
