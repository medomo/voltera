const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const stateInjection = `
  // Advanced Subscribers UI State
  const [subscriberViewMode, setSubscriberViewMode] = useState<'table' | 'grid'>('table');
  const [subscriberFilterZone, setSubscriberFilterZone] = useState<string>('all');
  const [subscriberFilterStatus, setSubscriberFilterStatus] = useState<string>('all');
  const [subscriberFilterTariff, setSubscriberFilterTariff] = useState<string>('all');
  const [selectedSubscribersIds, setSelectedSubscribersIds] = useState<string[]>([]);
  
  // New Subscriber Modal / Form State`;

code = code.replace('  // New Subscriber Modal / Form State', stateInjection);

const currentFilteredSubs = `  const filteredSubscribers = subscribers.filter(sub => {
    const q = subSearch.toLowerCase().trim();
    return (
      sub.name.toLowerCase().includes(q) ||
      sub.meterNumber.toLowerCase().includes(q) ||
      sub.phone.includes(q)
    );
  });`;

const newFilteredSubs = `  const filteredSubscribers = subscribers.filter(sub => {
    const q = subSearch.toLowerCase().trim();
    const matchSearch = sub.name.toLowerCase().includes(q) || sub.meterNumber.toLowerCase().includes(q) || sub.phone.includes(q);
    const matchZone = subscriberFilterZone === 'all' ? true : sub.zone === subscriberFilterZone;
    const matchStatus = subscriberFilterStatus === 'all' ? true : sub.status === subscriberFilterStatus;
    const matchTariff = subscriberFilterTariff === 'all' ? true : sub.tariffType === subscriberFilterTariff;
    return matchSearch && matchZone && matchStatus && matchTariff;
  });

  const handleBulkDelete = () => {
    if (confirm(\`هل أنت متأكد من حذف \${selectedSubscribersIds.length} مشتركين؟\`)) {
      const remaining = subscribers.filter(s => !selectedSubscribersIds.includes(s.id));
      onUpdateSubscribers(remaining);
      setSelectedSubscribersIds([]);
      logAction('حذف مشتركين بالجملة', \`تم حذف \${selectedSubscribersIds.length} مشتركين من النظام\`);
    }
  };

  const handleBulkToggleStatus = (targetStatus: 'active' | 'inactive') => {
      const updated = subscribers.map(s => {
          if (selectedSubscribersIds.includes(s.id)) {
              return { ...s, status: targetStatus };
          }
          return s;
      });
      onUpdateSubscribers(updated);
      setSelectedSubscribersIds([]);
      logAction('تغيير حالة مشتركين بالجملة', \`تم تغيير حالة \${selectedSubscribersIds.length} مشتركين إلى \${targetStatus === 'active' ? 'نشط' : 'موقف'}\`);
  };

  const toggleSubscriberSelection = (id: string) => {
      if (selectedSubscribersIds.includes(id)) {
          setSelectedSubscribersIds(selectedSubscribersIds.filter(i => i !== id));
      } else {
          setSelectedSubscribersIds([...selectedSubscribersIds, id]);
      }
  };
  
  const toggleAllSubscribersSelection = () => {
      if (selectedSubscribersIds.length === filteredSubscribers.length) {
          setSelectedSubscribersIds([]);
      } else {
          setSelectedSubscribersIds(filteredSubscribers.map(s => s.id));
      }
  };
`;

code = code.replace(currentFilteredSubs, newFilteredSubs);

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
console.log('State updated.');
