const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const targetStr = `    // Automatically suspended users due to high debt`;

const insertStr = `    // Low inventory alerts
    const lowInventory = inventory.filter(i => i.quantity <= i.minAlertLevel);
    lowInventory.forEach(item => {
        notifs.push({
            id: \`notif-inv-\${item.id}\`,
            type: 'low_inventory',
            message: \`المادة (\${item.name}) قاربت على النفاذ، الكمية المتبقية (\${item.quantity} \${item.unit}). يرجى توريد كمية جديدة.\`,
            time: item.lastUpdated || new Date().toISOString().substring(0,16).replace('T',' '),
            isNew: true
        });
    });

    // Automatically suspended users due to high debt`;

code = code.replace(targetStr, insertStr);

const bellColorStr = `notif.type === 'high_payment' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-rose-100 text-rose-700'`;
const bellColorNew = `notif.type === 'high_payment' ? 'bg-emerald-100 text-emerald-700' :
                              notif.type === 'low_inventory' ? 'bg-purple-100 text-purple-700' :
                              'bg-rose-100 text-rose-700'`;
code = code.replace(bellColorStr, bellColorNew);

const bellLabelStr = `{notif.type === 'high_consumption' ? 'استهلاك مرتفع' : notif.type === 'high_payment' ? 'قبض ضخم' : 'إيقاف ائتماني'}`;
const bellLabelNew = `{notif.type === 'high_consumption' ? 'استهلاك مرتفع' : notif.type === 'high_payment' ? 'قبض ضخم' : notif.type === 'low_inventory' ? 'رصيد منخفض' : 'إيقاف ائتماني'}`;
code = code.replace(bellLabelStr, bellLabelNew);

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
console.log('Added low inventory notifs.');
