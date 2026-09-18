sed -i -e '/import { SystemManagement }/i import { AdminReports } from "./AdminReports";' \
       -e '/import { SystemManagement }/i import { AdminDebt } from "./AdminDebt";' \
       -e '/import { SystemManagement }/i import { AdminZones } from "./AdminZones";' \
       -e '/import { SystemManagement }/i import { AdminRoles } from "./AdminRoles";' src/components/AdminDashboard.tsx
