const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Fix imports
code = code.replace(
  "import { \n  User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, TariffType, UserRole\n} from '../types';",
  "import { \n  User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, TariffType, UserRole, InventoryItem, InventoryTransaction\n} from '../types';"
);

// Fallback if not matched exactly
if (!code.includes("InventoryItem, InventoryTransaction") && code.includes("User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, TariffType, UserRole")) {
    code = code.replace(
        "User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, TariffType, UserRole",
        "User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, TariffType, UserRole, InventoryItem, InventoryTransaction"
    );
}

// Fix interface props
code = code.replace(
  "  onUpdateUsers: (users: User[]) => void;\n  inventory,\n  inventoryTransactions,\n  onUpdateInventory,\n  onUpdateInventoryTransactions,\n  onAddAuditLog: (log: AuditLog) => void;",
  "  onUpdateUsers: (users: User[]) => void;\n  onAddAuditLog: (log: AuditLog) => void;\n"
);

// Find where AdminDashboard is declared
const compDeclOld = "export function AdminDashboard({\n  currentUser,\n  onLogout,\n  subscribers,\n  readings,\n  payments,\n  settings,\n  auditLogs,\n  users,\n  onUpdateSubscribers,\n  onUpdateReadings,\n  onUpdatePayments,\n  onUpdateSettings,\n  onUpdateUsers,\n  inventory,\n  inventoryTransactions,\n  onUpdateInventory,\n  onUpdateInventoryTransactions,\n  onAddAuditLog\n}: AdminDashboardProps) {";

code = code.replace(
  "  onAddAuditLog\n}: AdminDashboardProps) {",
  "  onAddAuditLog,\n  inventory,\n  inventoryTransactions,\n  onUpdateInventory,\n  onUpdateInventoryTransactions\n}: AdminDashboardProps) {"
);

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
console.log('Fixed AdminDashboard.');
