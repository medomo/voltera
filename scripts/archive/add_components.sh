cat << 'INNER_EOF' > components_chunk.tsx
            {activeSection === 'reports' && (
              <AdminReports subscribers={subscribers} readings={readings} payments={payments} settings={settings} />
            )}

            {activeSection === 'debt' && (
              <AdminDebt subscribers={subscribers} settings={settings} />
            )}

            {activeSection === 'zones' && (
              <AdminZones subscribers={subscribers} />
            )}

            {activeSection === 'roles' && (
              <AdminRoles users={users} />
            )}
INNER_EOF
sed -i -e '/{activeSection === '\''admin-db'\'' && (/r components_chunk.tsx' src/components/AdminDashboard.tsx
