const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const injectionPoint = "  // --- STATISTICS CALCULATIONS ---";

const logic = `  const [showNotifications, setShowNotifications] = useState(false);

  const adminNotifications = useMemo(() => {
    const notifs: Array<{id: string, type: string, message: string, time: string, isNew: boolean}> = [];
    
    // High consumption readings
    const highReadings = readings.filter(r => r.consumption > 1000 && !r.isPosted);
    highReadings.forEach(r => {
        notifs.push({
            id: \`notif-read-\${r.id}\`,
            type: 'high_consumption',
            message: \`قراءة استهلاك مرتفعة جداً (\${r.consumption} ك.و) للمشترك \${r.subscriberName} بواسطة \${r.enteredBy}\`,
            time: r.readingDate,
            isNew: true
        });
    });

    // High payment amounts
    const highPayments = payments.filter(p => p.amountPaid >= 500000 && !p.isPosted);
    highPayments.forEach(p => {
        notifs.push({
            id: \`notif-pay-\${p.id}\`,
            type: 'high_payment',
            message: \`عملية قبض نقدي ضخمة (\${p.amountPaid.toLocaleString()} \${settings.currency}) للمشترك \${p.subscriberName} بواسطة \${p.receivedBy}\`,
            time: p.paymentDate,
            isNew: true
        });
    });

    // Automatically suspended users due to high debt
    const suspendedWithDebt = subscribers.filter(s => s.status === 'suspended' && s.currentBalance >= 1000000);
    suspendedWithDebt.forEach(s => {
        notifs.push({
            id: \`notif-susp-\${s.id}\`,
            type: 'suspended_debt',
            message: \`تنبيه: المشترك \${s.name} موقوف لتجاوز الحد الائتماني (\${s.currentBalance.toLocaleString()} \${settings.currency})\`,
            time: new Date().toISOString().substring(0,16).replace('T',' '), // Sort of mock time for this example
            isNew: true
        });
    });

    return notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [readings, payments, subscribers, settings.currency]);

  // --- STATISTICS CALCULATIONS ---`;

code = code.replace(injectionPoint, logic);
fs.writeFileSync('src/components/AdminDashboard.tsx', code);
console.log('Notifications logic added.');
