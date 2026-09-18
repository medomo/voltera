import fs from 'fs';

let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

content = content.replace(
  /if \(!window\.confirm\(`هل أنت متأكد من تحويل \${selectedIds\.length} مشترك إلى \${newStatus === 'active' \? 'نشط' : 'موقوف'}\؟`\)\) return;/g,
  ''
);

content = content.replace(
  /if \(selectedIds\.length === 0\) \{ alert\('يرجى تحديد مشترك واحد على الأقل'\); return; \}/g,
  'if (selectedIds.length === 0) return;'
);

content = content.replace(
  /if \(!window\.confirm\(`هل أنت متأكد من إرسال رسائل تذكير لـ \${selectedIds\.length} مشترك\؟`\)\) return;/g,
  ''
);

content = content.replace(
  /alert\('تم جدولة رسائل التذكير بنجاح'\);/g,
  ''
);

// Add disabled prop back to buttons
content = content.replace(
  /onClick=\{\(\) => handleBulkStatusToggle\('suspended'\)\}/g,
  "disabled={selectedIds.length === 0}\n            onClick={() => handleBulkStatusToggle('suspended')}"
);

content = content.replace(
  /onClick=\{\(\) => handleBulkStatusToggle\('active'\)\}/g,
  "disabled={selectedIds.length === 0}\n            onClick={() => handleBulkStatusToggle('active')}"
);

content = content.replace(
  /onClick=\{handleBulkReminder\}/g,
  "disabled={selectedIds.length === 0}\n            onClick={handleBulkReminder}"
);

content = content.replace(
  /onClick=\{handleBulkExport\}/g,
  "disabled={selectedIds.length === 0}\n            onClick={handleBulkExport}"
);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);

