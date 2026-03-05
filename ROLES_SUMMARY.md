# 👥 User Roles - Kompletní Návrh ✅

## 📦 Co Bylo Vytvořeno

### 📚 Dokumentace (4 soubory)
1. **ROLES_DESIGN.md** - Teoretický návrh s matrixí oprávnění
2. **ROLES_IMPLEMENTATION.md** - Praktický guide s příklady kódu
3. **ROLES_UI_UX.md** - UI/UX design a dashboardy per role
4. **ROLES_SUMMARY.md** (tento soubor)

### 💻 Kód (10 souborů)
1. **database/seeders/RoleAndPermissionSeeder.php** ✅ Updated
   - 5 rolí (Superadmin, Admin, Manager, Technician, Viewer)
   - 30+ granulárních oprávnění
   - Test user assignments

2. **app/Policies/BasePolicy.php** ✅ New
   - Abstraktní base class pro policies
   - Pomocné metody (authorize, hasRole, sameTenantt)

3. **app/Policies/ContractPolicy.php** ✅ New
   - view, create, update, delete, approve, changeStatus

4. **app/Policies/IncidentPolicy.php** ✅ New
   - view, create, update, delete, escalate, close

5. **app/Policies/AssetPolicy.php** ✅ New
   - view, create, update, delete, logMaintenance, scheduleMaintenance

6. **app/Policies/UserPolicy.php** ✅ New
   - view, create, update, delete, assignRole

7. **app/Providers/AuthServiceProvider.php** ✅ New
   - Policy registrations
   - Custom gates (admin, manager, technician, viewer)

8. **app/Http/Middleware/CheckPermission.php** ✅ New
   - Middleware pro permission checking

9. **app/Http/Middleware/CheckRole.php** ✅ New
   - Middleware pro role checking

10. **app/Http/Middleware/EnforceTenantIsolation.php** ✅ New
    - Middleware pro tenant isolation

---

## 🎯 5 Role Hierarchy

### 1. **SUPERADMIN** (Level 5)
```
Level: 5 (Highest)
Color: 🔴 Red (#FF0000)
Icon: 👑 Crown

Oprávnění: 100% - Vše
Scope: System-wide
Typickí uživatelé: System owner, IT administrator

Klíčové schopnosti:
✅ Manage tenants (create, suspend, delete)
✅ System configuration
✅ User & role management (cross-tenant)
✅ Billing & subscriptions
✅ Audit logs
✅ Všechno ostatní
```

### 2. **ADMIN** (Level 4)
```
Level: 4
Color: 🔴 Red (#FF6B6B)
Icon: 🛡️ Shield

Oprávnění: 95% - Všechno v tenant scope
Scope: Single tenant
Typickí uživatelé: Tenant admin, operations lead

Klíčové schopnosti:
✅ User management (v rámci tenant)
✅ Role & permission management (custom roles)
✅ All modules (contracts, assets, incidents, HR)
✅ Reports & analytics
✅ Settings & configuration
❌ Tenant management (create, delete)
❌ Billing
```

### 3. **MANAGER** (Level 3)
```
Level: 3
Color: 🟠 Orange (#FFA500)
Icon: 👔 Manager

Oprávnění: 60% - Management
Scope: Department/Team
Typickí uživatelé: Team lead, project manager, supervisor

Klíčové schopnosti:
✅ Contracts: view, create, edit, approve, change_status
✅ Assets: view, create, edit, log_maintenance, schedule_maintenance
✅ Incidents: view, create, edit, escalate, close
✅ Users: view, create, edit (own team)
✅ HR: view_employees, manage_shifts, approve_timeoff
✅ Reports: view, export, create
❌ Delete contracts/assets/incidents
❌ User role assignment
```

### 4. **TECHNICIAN** (Level 2)
```
Level: 2
Color: 🟢 Green (#4CAF50)
Icon: 🔧 Wrench

Oprávnění: 40% - Operational
Scope: Own tasks/Assigned
Typickí uživatelé: Mechanic, electrician, technician, field worker

Klíčové schopnosti:
✅ Contracts: view (all), edit (assigned), change_status
✅ Assets: view (all), log_maintenance
✅ Incidents: view (all), edit, escalate, close
✅ Users: view own profile
✅ HR: manage own workload, view shifts, request time-off
✅ Reports: view own metrics
❌ Create/delete contracts, assets, incidents
❌ Approve anything
```

### 5. **VIEWER** (Level 1)
```
Level: 1 (Lowest)
Color: ⚪ Gray (#9E9E9E)
Icon: 👁️ Eye

Oprávnění: 20% - Read-only
Scope: View-only
Typickí uživatelé: Client, external auditor, observer

Klíčové schopnosti:
✅ View contracts (all)
✅ View assets (all)
✅ View incidents (all)
✅ View reports (all)
✅ View own profile
❌ Create, edit, delete cokoli
❌ Approve
```

---

## 📊 Rozšíření: Custom Roles

Možnost vytvořit vlastní role s jakýmkoliv kombinacemi oprávnění:

```php
// Příklad: Senior Technician
$seniorTech = Role::create([
    'name' => 'Senior Technician',
    'level' => 2.5, // Between Technician (2) and Manager (3)
    'is_system' => false,
]);

// Přiřadit specific permissions
$seniorTech->permissions()->attach([
    'incidents.create',
    'assets.create',
    'assets.edit',
    // ... další
]);
```

---

## 🔐 3 Úrovně Authorization

### 1. **Routes Middleware**
```php
Route::post('/contracts', [ContractController::class, 'store'])
    ->middleware('check-permission:contracts,create');

Route::get('/admin', [AdminController::class, 'index'])
    ->middleware('check-role:admin');
```

### 2. **Blade Templates**
```blade
@can('create', App\Models\Contract::class)
    <button>Create Contract</button>
@endcan

@if(auth()->user()->hasPermission('contracts', 'approve'))
    <button>Approve</button>
@endif
```

### 3. **Controllers & Policies**
```php
public function update(Contract $contract)
{
    $this->authorize('update', $contract);
    // ...
}
```

---

## 📋 30+ Permissions Mapa

```
CONTRACTS (6):
  contracts.view
  contracts.create
  contracts.edit
  contracts.delete
  contracts.approve
  contracts.change_status

ASSETS (6):
  assets.view
  assets.create
  assets.edit
  assets.delete
  assets.log_maintenance
  assets.schedule_maintenance

INCIDENTS (6):
  incidents.view
  incidents.create
  incidents.edit
  incidents.delete
  incidents.escalate
  incidents.close

USERS (5):
  users.view
  users.create
  users.edit
  users.delete
  users.assign_role

HR (4):
  hr.view_employees
  hr.manage_shifts
  hr.approve_timeoff
  hr.manage_workload

REPORTS (3):
  reports.view
  reports.export
  reports.create

SETTINGS (3):
  settings.view
  settings.edit
  settings.manage_roles

SYSTEM (3):
  system.view_audit_logs
  system.manage_tenants
  system.system_config
```

---

## 🔒 Bezpečnostní Vlastnosti

### ✅ Tenant Isolation
- Všechny operace automaticky scoped na tenant_id
- Middleware enforcement
- Database constraints

### ✅ Role Hierarchy
- Uživatel nemůže přiřadit vyšší roli než má sám
- Level-based hierarchy (1-5)
- Custom role support

### ✅ Audit Trail
- Všechny role změny se logují
- AuditLog & ActivityLog tracking
- IP & User-Agent recording

### ✅ Soft Deletes
- Zachování historických rolí/permissions
- Restore capability
- Force delete pro admin

### ✅ Policy Morphing
- Automatic scoping v policies
- Resource-based authorization
- Granular control

---

## 🎨 UI/UX Features

### Role Badges
```
[👑 Superadmin]  - Red
[🛡️ Admin]       - Red
[👔 Manager]     - Orange
[🔧 Technician]  - Green
[👁️ Viewer]      - Gray
```

### Per-Role Dashboards
- **Superadmin**: System overview, tenant management, analytics
- **Admin**: Tenant overview, user management, all modules
- **Manager**: Team workload, contracts approval, HR management
- **Technician**: My tasks, assigned incidents, workload
- **Viewer**: Project status, read-only reports

### Conditional UI
- Role-based button visibility
- Permission-gated sections
- Smart permission matrix display

---

## 🚀 Implementace Checklist

```
✅ Database - Migrace & tabulky
✅ Models - User, Role, Permission
✅ Seeders - 5 rolí + 30+ permissions
✅ Policies - Contract, Incident, Asset, User
✅ Gates - Custom authorization
✅ Middleware - Permission, Role, Tenant isolation
✅ AuthServiceProvider - Policy registration
✅ Documentation - Design, Implementation, UI/UX
```

---

## 📖 File Structure

```
F:\laravel\operations-control-center\
│
├── 📚 Documentation:
│   ├── ROLES_DESIGN.md (Návrh + permission matrix)
│   ├── ROLES_IMPLEMENTATION.md (Praktický guide)
│   ├── ROLES_UI_UX.md (Dashboardy & UI)
│   └── ROLES_SUMMARY.md (Tento soubor)
│
├── 💻 Seeders:
│   └── database/seeders/RoleAndPermissionSeeder.php
│
├── 🔐 Policies:
│   ├── app/Policies/BasePolicy.php
│   ├── app/Policies/ContractPolicy.php
│   ├── app/Policies/IncidentPolicy.php
│   ├── app/Policies/AssetPolicy.php
│   └── app/Policies/UserPolicy.php
│
├── ⚙️ Providers:
│   └── app/Providers/AuthServiceProvider.php
│
└── 🛡️ Middleware:
    ├── app/Http/Middleware/CheckPermission.php
    ├── app/Http/Middleware/CheckRole.php
    └── app/Http/Middleware/EnforceTenantIsolation.php
```

---

## 🎯 Test Users

```
Email                   Password  Role         Level
─────────────────────────────────────────────────────
superadmin@test.local   password  Superadmin   5
admin@test.local        password  Admin        4
manager@test.local      password  Manager      3
tech@test.local         password  Technician   2
viewer@test.local       password  Viewer       1
```

**Poznámka:** Heslo se dá změnit v DatabaseSeeder.php

---

## 💡 Příklady Použití

### Vytvoření Role (Custom)
```php
$role = Role::create([
    'tenant_id' => $tenantId,
    'name' => 'Lead Technician',
    'level' => 2.5,
    'is_system' => false,
]);

$role->permissions()->attach([...]);
```

### Přiřazení Role Uživateli
```php
$user->roles()->attach($role);
// nebo
$user->roles()->sync([$role->id]);
```

### Kontrola Oprávnění
```php
if ($user->hasPermission('contracts', 'approve')) {
    // Povoleno
}

if ($user->hasRole('Manager')) {
    // Povoleno
}
```

### V Route
```php
Route::post('/contracts/{id}/approve', [...])
    ->middleware('check-permission:contracts,approve');
```

### V Blade
```blade
@if(auth()->user()->hasPermission('contracts', 'delete'))
    <button>Smazat</button>
@endif
```

---

## 🎉 Shrnutí

User roles systém je nyní **kompletně navržen a implementován**:

✅ **5 systémových rolí** s jasnou hierarchií  
✅ **30+ granulárních oprávnění** pro fine-grained control  
✅ **Laravel Policies** pro model-based authorization  
✅ **Custom Gates** pro action-based control  
✅ **Middleware** pro route-level protection  
✅ **Tenant Isolation** pro multi-tenant bezpečnost  
✅ **Audit Trail** pro compliance  
✅ **Custom Role Support** pro flexibility  

---

## 🚀 Příští Kroky

1. ✅ Roles & Permissions
2. ⏭️ API Controllers & Resources
3. ⏭️ Request Validation
4. ⏭️ Error Handling
5. ⏭️ Frontend Integration (Next.js)

---

**User Roles Design je HOTOV!** 🎉

Pro detaily viz:
- **ROLES_DESIGN.md** - Teoretický návrh
- **ROLES_IMPLEMENTATION.md** - Praktická implementace
- **ROLES_UI_UX.md** - UI/UX design

