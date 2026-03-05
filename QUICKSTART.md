# 🚀 Quick Start Guide - Operations Control Center

## 📦 Instalace a Setup

### 1. Klonování a Dependencies

```bash
cd F:\laravel\operations-control-center
composer install
npm install
```

### 2. Konfigurace

```bash
# Zkopírovat .env
cp .env.example .env

# Generovat app key
php artisan key:generate

# Setup databáze
php artisan migrate
php artisan db:seed
php artisan db:seed --class=RoleAndPermissionSeeder
```

### 3. Spuštění

```bash
# Development server
php artisan serve

# V jiném terminálu - Queue worker
php artisan queue:listen --tries=1

# V třetím terminálu - Frontend
npm run dev
```

Aplikace poběží na `http://localhost:8000`

---

## 👥 Test Uživatelé

```
Email                   | Password  | Role
admin@test.local       | password  | Admin
manager@test.local     | password  | Manager
tech@test.local        | password  | Technician
viewer@test.local      | password  | Viewer
```

---

## 📊 Databázová Struktura - Principais Tabulky

### 🏢 Core
- **tenants** - Workspace/tenants
- **users** - Uživatelé systému
- **roles** - Role s hierarchií (admin/manager/technician/viewer)
- **permissions** - Granulární oprávnění (resource.action)
- **user_roles** - Přiřazení rolí uživatelům

### 📝 Contracts (Zakázky)
- **contracts** - Status: draft → approved → in_progress → blocked → done
- **contract_status_history** - Audit trail stavů
- **contract_incidents** - Incidenty связаní s kontraktem

### 🧰 Assets (Majetek)
- **asset_categories** - Kategorie (stroje, IT, atd.)
- **assets** - Status: operational, maintenance, repair, retired, disposed
- **maintenance_logs** - Kompletní servisní historie
- **maintenance_schedules** - Plánovaná údržba s notifikacemi
- **asset_audit_trail** - Audit všech změn

### 👷 HR (Lidské Zdroje)
- **employee_profiles** - Profily zaměstnanců
- **shifts** - Pracovní směny
- **employee_shifts** - Přiřazení směn
- **time_off_requests** - Žádosti o volno
- **workload** - Denní vytížení zaměstnanců

### 🚨 Incidents (Incidenty)
- **incidents** - Status: open → in_progress → escalated → resolved → closed
- **incident_timeline** - Kompletní event log
- **incident_assignments** - Přiřazení s rolemi
- **incident_escalations** - Eskalační workflow
- **incident_comments** - Veřejné + interní poznámky

### 📡 Event Sourcing & Audit
- **events** - Immutable event log pro všechny změny
- **event_snapshots** - Cachované stavy agregátů
- **event_projections** - CQRS read models
- **audit_logs** - Detailní audit trail (old/new values)
- **activity_logs** - User activity tracking

### 🔔 Notifikace
- **notifications** - User notifications
- **notification_schedules** - Pravidla notifikací
- **alerts** - Systémové alerty (sla_breach, maintenance_due, atd.)

### 🔍 Search
- **search_index** - Fulltext search agregace
- **search_queries** - Analytics vyhledávání

---

## 🔑 Klíčové Features

### ✅ Multi-Tenancy
- Izolace dat podle `tenant_id`
- Automatické query scoping
- Cascading deletes

### ✅ RBAC (Role-Based Access Control)
```php
// Kontrola oprávnění
if ($user->hasPermission('contracts', 'edit')) {
    // Povoleno
}

// Kontrola role
if ($user->hasRole('Manager')) {
    // Povoleno
}

// Admin check
if ($user->isAdmin()) {
    // Povoleno
}
```

### ✅ Stavové Automaty
- **Contracts**: draft → approved → in_progress → blocked → done
- **Incidents**: open → in_progress → escalated → resolved → closed
- Metoda na změnu: `$contract->changeStatus('approved', $user, 'reason')`

### ✅ SLA Tracking
- Response deadline (incidents)
- Resolution deadline (contracts & incidents)
- Automatic `sla_breached` flag
- Alert triggering na breach

### ✅ Event Sourcing
- Všechny kritické změny jako immutable events
- Event snapshots pro performance
- Full audit trail

### ✅ Soft Deletes
```php
// Soft delete
$contract->delete();

// Restore
$contract->restore();

// Permanent delete
$contract->forceDelete();

// Vidět i smazané
$contracts = Contract::withTrashed()->get();
```

### ✅ Audit Trail
```php
// Detailní změny
AuditLog::forModel('Contract', $id)->get();

// User activity
ActivityLog::byUser($userId)->recent()->get();
```

---

## 📚 Použití Modelů

### Contracts
```php
// Vytvoření
$contract = Contract::create([
    'tenant_id' => auth()->user()->tenant_id,
    'contract_number' => 'CNT-001',
    'title' => 'Web Development',
    'assigned_to' => $user->id,
    'status' => 'draft',
]);

// Změna stavu
$contract->changeStatus('approved', auth()->user(), 'Approved by manager');

// Přidání incidentu
$contract->incidents()->create([
    'title' => 'Bug found',
    'severity' => 'high',
    'reported_by' => auth()->id(),
]);

// Sledování SLA
if ($contract->sla_status === 'breached') {
    Alert::create([...]);
}
```

### Assets
```php
// Vytvoření
$asset = Asset::create([
    'tenant_id' => $tenantId,
    'name' => 'Server Dell',
    'asset_tag' => 'SRV-001',
    'status' => 'operational',
    'next_maintenance' => now()->addDays(30),
]);

// Log maintenance
$asset->logMaintenance(auth()->user(), 'preventive', 'Oil change', [
    'hours_spent' => 2.5,
    'cost' => 150.00,
]);

// Check due for maintenance
if ($asset->isDueForMaintenance()) {
    // Notify maintenance team
}

// Schedule next
$asset->scheduleNextMaintenance();
```

### Incidents
```php
// Vytvoření
$incident = Incident::create([
    'tenant_id' => $tenantId,
    'title' => 'System Down',
    'severity' => 'critical',
    'reported_by' => auth()->id(),
    'sla_response_minutes' => 30,
    'sla_resolution_minutes' => 240,
]);

// Přiřazení
$incident->assignTo($technician, auth()->user(), 'primary');

// Komentář
$incident->addComment(auth()->user(), 'Working on it', $isInternal = false);

// Eskalace
$incident->escalate(auth()->user(), $manager, 'level_2', 'Needs approval');

// Změna stavu
$incident->changeStatus('resolved');

// SLA checks
$incident->isResponseSlaBreach();   // bool
$incident->isResolutionSlaBreach(); // bool
$incident->remainingSlaTime();      // minutes
```

### HR
```php
// Employee profile
$employee = EmployeeProfile::find($id);

// Current shift
$currentShift = $employee->getCurrentShift();

// Set on leave
$employee->setOnLeave(until: now()->addDays(5));

// Check availability
if ($employee->isAvailable()) {
    // Assign work
}

// Workload
Workload::create([
    'employee_id' => $employee->id,
    'work_date' => today(),
    'hours_allocated' => 8,
    'capacity_utilization' => $employee->calculateUtilization(),
]);

// Time off request
TimeOffRequest::create([
    'employee_id' => $employee->id,
    'type' => 'vacation',
    'start_date' => $startDate,
    'end_date' => $endDate,
    'requested_by' => auth()->id(),
    'status' => 'pending',
]);
```

---

## 🧪 Testing

```bash
# Refresh database
php artisan migrate:refresh --seed

# Run all tests
php artisan test

# Run specific test
php artisan test tests/Feature/ContractTest.php

# Run with coverage
php artisan test --coverage
```

---

## 🔍 Debugging

### Tinker (Interactive CLI)
```bash
php artisan tinker

# Examples:
> $user = User::first();
> $user->hasPermission('contracts', 'view');
> $contracts = Contract::ofTenant(auth()->user()->tenant_id)->get();
> $incident = Incident::with('assignments', 'escalations')->find(1);
> $asset->isDueForMaintenance();
```

### Logging
```php
// V modelech/controllery
Log::info('Contract status changed', [
    'contract_id' => $contract->id,
    'old_status' => $oldStatus,
    'new_status' => $newStatus,
]);

// Logs v: storage/logs/laravel.log
```

---

## 📖 Dokumentace Souborů

- **DATABASE_SETUP.md** - Detailní databázová struktura
- **database/MIGRATIONS.md** - Migrace s příklady
- **README.md** - Laravel base README

---

## 🚀 Další Kroky

1. ✅ Databázová struktura
2. ⏭️ API Controllers & Resources
3. ⏭️ Policies & Middleware  
4. ⏭️ Events & Listeners
5. ⏭️ Tests
6. ⏭️ Frontend (Next.js)

---

**Databáze je hotová! Připraveno pro vývoj API.** 🎉

