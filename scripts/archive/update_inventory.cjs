const fs = require('fs');
let code = fs.readFileSync('src/components/AdminInventory.tsx', 'utf8');

// Update state type
code = code.replace(
  "const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');",
  "const [transactionType, setTransactionType] = useState<'in' | 'out' | 'damage'>('in');"
);

// Update condition for out limit
code = code.replace(
  "if (transactionType === 'out' && qty > selectedItem.quantity) {",
  "if ((transactionType === 'out' || transactionType === 'damage') && qty > selectedItem.quantity) {"
);

// Update quantity math
code = code.replace(
  "quantity: transactionType === 'in' ? item.quantity + qty : item.quantity - qty,",
  "quantity: transactionType === 'in' ? item.quantity + qty : item.quantity - qty,"
);

// Update log message
code = code.replace(
  "logAction('عملية مخزنية', \`تم تسجيل \${transactionType === 'in' ? 'توريد' : 'صرف'} \${qty} \${selectedItem.unit} للصنف \${selectedItem.name}\`);",
  "logAction('عملية مخزنية', \`تم تسجيل \${transactionType === 'in' ? 'توريد' : transactionType === 'damage' ? 'تالف' : 'صرف'} \${qty} \${selectedItem.unit} للصنف \${selectedItem.name}\`);"
);

// Add button for damage
code = code.replace(
  /                            setTransactionType\('in'\);\n                            setShowTransactionModal\(true\);\n                        \}\}\n                        className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-1\.5 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1"\n                    >\n                        توريد\n                        <ArrowUpRight className="w-3\.5 h-3\.5" \/>\n                    <\/button>\n                <\/div>/g,
  `                            setTransactionType('in');
                            setShowTransactionModal(true);
                        }}
                        className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-1.5 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1"
                    >
                        توريد
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => {
                            setSelectedItem(item);
                            setTransactionType('damage');
                            setShowTransactionModal(true);
                        }}
                        className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 py-1.5 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1"
                    >
                        توالف
                        <AlertTriangle className="w-3.5 h-3.5" />
                    </button>
                </div>`
);

// Update modal UI for transaction
code = code.replace(
  /className=\{`p-4 text-right text-white font-bold \$\{transactionType === 'in' \? 'bg-emerald-600' : 'bg-rose-600'\}`\}/g,
  "className={`p-4 text-right text-white font-bold ${transactionType === 'in' ? 'bg-emerald-600' : transactionType === 'damage' ? 'bg-rose-700' : 'bg-rose-600'}`}"
);

code = code.replace(
  /<h3>\{transactionType === 'in' \? 'سند إدخال \(توريد\) لمخزن' : 'سند إخراج \(صرف\) من مخزن'\}<\/h3>/g,
  "<h3>{transactionType === 'in' ? 'سند إدخال (توريد) لمخزن' : transactionType === 'damage' ? 'تسجيل توالف / نقص' : 'سند إخراج (صرف) من مخزن'}</h3>"
);

code = code.replace(
  /الكمية المراد \{transactionType === 'in' \? 'إضافتها' : 'صرفها'\}/g,
  "الكمية المراد {transactionType === 'in' ? 'إضافتها' : transactionType === 'damage' ? 'إتلافها/خصمها' : 'صرفها'}"
);

code = code.replace(
  /max=\{transactionType === 'out' \? selectedItem\.quantity : undefined\}/g,
  "max={transactionType === 'out' || transactionType === 'damage' ? selectedItem.quantity : undefined}"
);

code = code.replace(
  /placeholder=\{transactionType === 'out' \? 'الجهة المستلمة للمواد' : 'رقم فاتورة المورد'\}/g,
  "placeholder={transactionType === 'out' ? 'الجهة المستلمة للمواد' : transactionType === 'damage' ? 'سبب الإتلاف أو التلف' : 'رقم فاتورة المورد'}"
);

code = code.replace(
  /className=\{`flex-1 py-2 rounded-lg text-sm font-bold text-white \$\{transactionType === 'in' \? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'\}`\}/g,
  "className={`flex-1 py-2 rounded-lg text-sm font-bold text-white ${transactionType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : transactionType === 'damage' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-rose-600 hover:bg-rose-700'}`}"
);


fs.writeFileSync('src/components/AdminInventory.tsx', code);
