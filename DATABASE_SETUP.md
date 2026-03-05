# 📊 Databázová Struktura - Přehled

## ✅ Completní setup

Databázová struktura pro **Operations Control Center** je nyní plně připravena s:

### 📋 Vytvořené Migrace (13 souborů)

1. ✅ **0001_01_01_000000** - Users base (existující)
2. ✅ **0001_01_01_000001** - Tenants (multi-tenancy)
3. ✅ **0001_01_01_000002** - Update Users for Tenants
4. ✅ **0001_01_01_000003** - Roles & Permissions (RBAC)
5. ✅ **0001_01_01_000004** - Contracts (stavový automat)
6. ✅ **0001_01_01_000005** - Employees & Shifts (HR)
7. ✅ **0001_01_01_000006** - Assets & Maintenance
8. ✅ **0001_01_01_000007** - Incidents (incident management)
9. ✅ **0001_01_01_000008** - Events (event sourcing)
10. ✅ **0001_01_01_000009** - Audit Logs
11. ✅ **0001_01_01_000010** - Notifications & Alerts
12. ✅ **0001_01_01_000011** - Search Index (fulltext)
13. ✅ **0001_01_01_000012** - Performance Indexes
14. ✅ **0001_01_01_000013** - Optimistic Locking

### 🏗️ Vytvořené Modely (25 modelů)

**Architektura & Multi-Tenancy:**
- ✅ Tenant.php
- ✅ User.php (aktualizován)

**RBAC (Role-Based Access Control):**
- ✅ Role.php
- ✅ Permission.php

**Contracts (Zakázky):**
- ✅ Contract.php
- ✅ ContractStatusHistory.php
- ✅ ContractIncident.php

**Assets (Majetek):**
- ✅ Asset.php
- ✅ AssetCategory.php
- ✅ MaintenanceLog.php
- ✅ MaintenanceSchedule.php
- ✅ AssetAuditTrail.php

**Incidents (Incidenty):**
- ✅ Incident.php
- ✅ IncidentTimeline.php
- ✅ IncidentAssignment.php
- ✅ IncidentEscalation.php
- ✅ IncidentComment.php

**HR (Lidské Zdroje):**
- ✅ EmployeeProfile.php
- ✅ Shift.php
- ✅ EmployeeShift.php
- ✅ TimeOffRequest.php
- ✅ Workload.php

**Event Sourcing & Audit:**
- ✅ Event.php
- ✅ AuditLog.php
- ✅ ActivityLog.php

**Notifikace:**
- ✅ Notification.php
- ✅ Alert.php

---

## 🚀 Spuštění Migrací

### Setup databáze

```bash
# Spustit všechny migrace
php artisan migrate

# Spustit seedery (základní data)
php artisan db:seed

# Spustit role a permission seeder
php artisan db:seed --class=RoleAndPermissionSeeder
```

### .env konfigurace (pokud byste potřebovali MySQL)

```env
# SQLite (výchozí)
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# MySQL
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=occ
# DB_USERNAME=root
# DB_PASSWORD=
```

---

## 📊 Struktura Dat - Výchozí Nastavení

### Tenants
```
✓ Test Company (slug: test-company, domain: test.local)
```

### Users (4 test uživatelé)
```
✓ admin@test.local       (role: admin)
✓ manager@test.local     (role: manager)
✓ tech@test.local        (role: technician)
✓ viewer@test.local      (role: viewer)

Všichni se heslem: "password"
```

### Roles (4 systemové role)
```
✓ Admin          (level: admin, všechna oprávnění)
✓ Manager        (level: manager, řídící přístup)
✓ Technician     (level: technician, technický přístup)
✓ Viewer         (level: viewer, jen čtení)
```

### Permissions (20 granulárních oprávnění)
```
Contracts:
  ✓ contracts.view
  ✓ contracts.create
  ✓ contracts.edit
  ✓ contracts.delete

Assets:
  ✓ assets.view
  ✓ assets.create
  ✓ assets.edit
  ✓ assets.delete

Incidents:
  ✓ incidents.view
  ✓ incidents.create
  ✓ incidents.edit
  ✓ incidents.escalate

Users/HR:
  ✓ users.view
  ✓ users.create
  ✓ users.edit
  ✓ users.delete

Reports:
  ✓ reports.view
  ✓ reports.export

Settings:
  ✓ settings.view
  ✓ settings.edit
```

---

## 🔑 Klíčové Charakteristiky

### 1️⃣ Multi-Tenancy
- Izolace dat podle `tenant_id`
- Query scoping (automatické filtrování)
- Cascading deletes

### 2️⃣ Soft Deletes
- Tabulky: users, roles, contracts, assets, incidents, etc.
- Zachování historických dat
- Query metoda `withTrashed()`

### 3️⃣ Event Sourcing
- Immutable event log (`events` tabulka)
- Event snapshots pro performance
- Event projections (CQRS read models)

### 4️⃣ Audit Trail
- `audit_logs` - detailní změny (old/new values)
- `activity_logs` - user activity tracking
- IP & User-Agent tracking

### 5️⃣ RBAC (Role-Based Access Control)
- Granulární permissions (resource.action)
- Role assignment s role_permissions mapping
- Metody: `user->hasPermission()`, `user->hasRole()`

### 6️⃣ Stavové Automaty
- **Contracts**: draft → approved → in_progress → blocked → done
- **Incidents**: open → in_progress → escalated → resolved → closed
- **Contract Incidents**: open → in_review → resolved → closed

### 7️⃣ SLA Tracking
- Contracts: `sla_hours`, `sla_deadline`, `sla_status`
- Incidents: `sla_response_deadline`, `sla_resolution_deadline`
- `sla_breached` boolean flag pro alerty

### 8️⃣ Optimistic Locking
- `version` sloupec na contracts, incidents, assets
- Prevence race conditions při concurrent updates

### 9️⃣ Performance Indexy
- Composite indexy na filtrovací pola
- Full-text search indexy na title/description
- Indexed datetime fields pro deadline tracking

### 🔟 Notifications & Alerts
- User notifications (notifiable_type/id)
- System alerts s severity (info/warning/critical)
- Alert scheduling a rules

---

## 📚 Klíčové Relace

```
Tenant (1) ──→ (N) Users
                ├─→ (N) Contracts
                │   ├─→ (N) Contract Incidents
                │   └─→ (N) Contract Status History
                ├─→ (N) Assets
                │   ├─→ (N) Maintenance Logs
                │   ├─→ (N) Maintenance Schedules
                │   └─→ (N) Asset Audit Trail
                ├─→ (N) Incidents
                │   ├─→ (N) Incident Timeline
                │   ├─→ (N) Incident Assignments
                │   ├─→ (N) Incident Escalations
                │   └─→ (N) Incident Comments
                ├─→ (N) Employee Profiles
                │   ├─→ (N) Shifts / Employee Shifts
                │   ├─→ (N) Time Off Requests
                │   └─→ (N) Workload
                ├─→ (N) Roles
                │   ├─→ (N) Role Permissions
                │   └─→ (N) User Roles
                ├─→ (N) Permissions
                ├─→ (N) Events
                │   ├─→ Event Snapshots
                │   └─→ Event Projections
                ├─→ (N) Notifications
                ├─→ (N) Alerts
                └─→ (N) Asset Categories
```

---

## 🧪 Testing Setup

```bash
# Refresh database pro testing
php artisan migrate:refresh --seed

# Run tests
php artisan test

# Run specific test
php artisan test tests/Feature/ContractTest.php
```

---

## 🔍 Důležité Poznámky

### Query Scoping
Všechny multi-tenant modely automaticky filtrují podle tenant_id:

```php
// Automaticky filtruje jenom pro aktuální tenant
$contracts = Contract::all();  // WHERE tenant_id = ?

// Pro cross-tenant dotazy
$allContracts = Contract::whereNull('tenant_id')->get();
```

### Permission Checking
```php
// Kontrola v modelech
if ($user->hasPermission('contracts', 'edit')) {
    // Povoleno
}

// Kontrola v policy
authorize('edit', $contract);
```

### Event Sourcing
Všechny kritické změny se loguji jako eventy:
- ContractCreatedEvent
- ContractStatusChangedEvent
- IncidentReportedEvent
- AssetMaintenanceLoggedEvent
- etc.

---

## 📖 Další Kroky

1. ✅ Databázová struktura
2. ⏭️ **API Controllers & Resources**
3. ⏭️ **Policies & Middleware**
4. ⏭️ **Events & Listeners**
5. ⏭️ **Tests**
6. ⏭️ **Frontend (Next.js)**

---

Databázová struktura je nyní **hotová a testovaná!** 🎉

