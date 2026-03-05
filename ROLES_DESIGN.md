# 👥 User Roles - Návrh pro Operations Control Center

## 📋 Přehled

Operations Control Center má **5 základních rolí** (+ custom role) s hierarchickou strukturou a granulárními oprávněními.

---

## 🏆 Základní Role (Systemové)

### 1. **SUPERADMIN** (Level 5)
**Popis:** Správce systému, full access

**Oprávnění:**
- ✅ Vše (všechny moduly, všechny operace)
- ✅ Tenant management (create, suspend, activate tenants)
- ✅ User management (create, edit, delete, assign roles)
- ✅ Role & Permission management
- ✅ System logs & analytics
- ✅ Billing & subscription (pokud existuje)

**Typické uživatele:**
- Majitel/CEO
- Senior IT administrátor

**Use Cases:**
- Vytvoření nového tenanta
- Přiřazení role admin jiným uživatelům
- Zásahy do kritických dat
- Smazání dat

---

### 2. **ADMIN** (Level 4)
**Popis:** Správce tenanta, přístup ke všemu v rámci tenanta

**Oprávnění:**
- ✅ Vše v rámci **vlastního tenanta**
- ✅ User management (create, edit, delete, assign roles)
- ✅ Role & Permission management
- ✅ Všechny moduly: contracts, assets, incidents, HR
- ✅ Reports & analytics
- ✅ Settings & configuration
- ✅ Audit logs (čtení)
- ❌ Tenant management (suspenze, delete)
- ❌ Billing management
- ❌ Cross-tenant přístup

**Typické uživatele:**
- IT administrátor tenanta
- Vedoucí provozu
- Projektový manažer

**Use Cases:**
- Nastavení nových zaměstnanců
- Konfigurace workflowů
- Audit & monitoring
- Emergency data recovery

---

### 3. **MANAGER** (Level 3)
**Popis:** Vedoucí oddělení/projektu, řídící přístup

**Oprávnění:**

**Contracts (Zakázky):**
- ✅ view, create, edit
- ✅ approve/reject
- ✅ change status
- ✅ assign to technicians
- ❌ delete

**Assets (Majetek):**
- ✅ view, create, edit
- ✅ schedule maintenance
- ✅ assign to technicians
- ❌ delete

**Incidents (Incidenty):**
- ✅ view, create, edit
- ✅ assign/escalate
- ✅ approve time-off requests
- ❌ delete

**HR (Lidské zdroje):**
- ✅ view employees
- ✅ view shifts & workload
- ✅ approve time-off requests
- ✅ edit employee profiles
- ❌ delete employees

**Reports:**
- ✅ view & export
- ✅ custom reports

**Settings:**
- ✅ view only

**Typické uživatele:**
- Vedoucí oddělení
- Vedoucí projektu
- Supervisor

**Use Cases:**
- Schválení kontraktů
- Přiřazení prací techniky
- Schválení volna
- Reporting

---

### 4. **TECHNICIAN** (Level 2)
**Popis:** Pracovníci v terénu, praktické práce

**Oprávnění:**

**Contracts (Zakázky):**
- ✅ view (přiřazené & veřejné)
- ✅ edit status (in_progress, blocked)
- ✅ add comments
- ❌ create, delete, approve

**Assets (Majetek):**
- ✅ view
- ✅ log maintenance
- ✅ report issues
- ❌ create, edit, delete

**Incidents (Incidenty):**
- ✅ view (přiřazené & veřejné)
- ✅ update status
- ✅ add comments
- ✅ escalate
- ❌ create incident (v některých případech ✅)
- ❌ delete

**HR (Lidské zdroje):**
- ✅ view own profile
- ✅ view own shifts
- ✅ request time-off
- ✅ view workload
- ❌ edit others

**Reports:**
- ✅ view own metrics
- ❌ create custom reports

**Typické uživatele:**
- Mechanik
- Elektrikář
- Servisní technik
- Údržbář

**Use Cases:**
- Logging práce na kontraktech
- Logování údržby
- Reportování problémů
- Žádost o volno

---

### 5. **VIEWER** (Level 1)
**Popis:** Čtenář, read-only přístup

**Oprávnění:**
- ✅ view contracts
- ✅ view assets
- ✅ view incidents
- ✅ view reports
- ✅ view own profile
- ❌ create, edit, delete cokoli
- ❌ approve/reject

**Typické uživatele:**
- Klient/zákazník
- Externí auditor
- Report viewer
- Management (visibility only)

**Use Cases:**
- Sledování stavu projektů
- Kontrola výkonnosti
- Transparentnost (klient vidí co se děje)

---

## 🎯 Custom Role Template

Pro specifické potřeby je možné vytvořit custom role:

```php
// Příklad: Custom "Senior Technician" role
$role = Role::create([
    'tenant_id' => $tenant->id,
    'name' => 'Senior Technician',
    'description' => 'Experienced technician with supervisory duties',
    'level' => 2.5, // Between Technician (2) and Manager (3)
    'is_system' => false,
    'metadata' => [
        'color' => '#FF9800',
        'icon' => 'shield-check',
        'department' => 'Maintenance',
    ],
]);

// Přiřadit specific permissions
$role->permissions()->attach([
    Permission::where('resource', 'incidents')->where('action', 'create')->first()->id,
    Permission::where('resource', 'assets')->where('action', 'create')->first()->id,
    // ... dalších
]);
```

---

## 📊 Permission Matrix

| Permission | Superadmin | Admin | Manager | Technician | Viewer |
|------------|:----------:|:-----:|:-------:|:----------:|:------:|
| **Contracts** |
| contracts.view | ✅ | ✅ | ✅ | ✅ | ✅ |
| contracts.create | ✅ | ✅ | ✅ | ❌ | ❌ |
| contracts.edit | ✅ | ✅ | ✅ | ⚠️* | ❌ |
| contracts.delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| contracts.approve | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Assets** |
| assets.view | ✅ | ✅ | ✅ | ✅ | ✅ |
| assets.create | ✅ | ✅ | ✅ | ❌ | ❌ |
| assets.edit | ✅ | ✅ | ✅ | ⚠️* | ❌ |
| assets.delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| assets.log_maintenance | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Incidents** |
| incidents.view | ✅ | ✅ | ✅ | ✅ | ✅ |
| incidents.create | ✅ | ✅ | ✅ | ⚠️* | ❌ |
| incidents.edit | ✅ | ✅ | ✅ | ✅ | ❌ |
| incidents.delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| incidents.escalate | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Users & HR** |
| users.view | ✅ | ✅ | ✅ | ⚠️* | ❌ |
| users.create | ✅ | ✅ | ❌ | ❌ | ❌ |
| users.edit | ✅ | ✅ | ⚠️* | ⚠️* | ❌ |
| users.delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| users.assign_role | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Reports** |
| reports.view | ✅ | ✅ | ✅ | ✅ | ✅ |
| reports.export | ✅ | ✅ | ✅ | ⚠️* | ❌ |
| reports.create | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Settings** |
| settings.view | ✅ | ✅ | ⚠️* | ❌ | ❌ |
| settings.edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| **System** |
| system.manage_roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| system.manage_tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| system.audit_logs | ✅ | ✅ | ❌ | ❌ | ❌ |

**⚠️\*** = Limited scope (only own/assigned items, or department-specific)

---

## 🔐 Scope Modifiers (Omezení Přístupu)

Pro jemnější kontrolu přístupu používáme scope modifiers:

### **Own Resources**
```php
// User vidí jen svoje věci
$contracts = Contract::where('assigned_to', auth()->id())->get();
```

### **Department Scope**
```php
// Manager vidí jen svého oddělení
$employees = EmployeeProfile::where('department', auth()->user()->department)->get();
```

### **Tenant Scope**
```php
// Všechny role jsou omezeny na tenant_id
// (automaticky aplikováno GlobalScope)
$incidents = Incident::ofTenant(auth()->user()->tenant_id)->get();
```

### **Status Scope**
```php
// Technician nemůže delete, ale může change status
$contract->update(['status' => 'in_progress']); // ✅
$contract->delete(); // ❌ policy zabrání
```

---

## 🎬 Role Transitions (Kariérní Cesty)

### Technician → Manager
```
Technician (Level 2)
    ↓ (experience + skills)
Senior Technician (Custom Level 2.5)
    ↓ (supervisory experience)
Manager (Level 3)
    ↓ (strategic experience)
Admin (Level 4)
```

### Best Practice
- Žádná "skokání" na Admin bez Manager zkušenosti
- Clear progression paths
- Skills-based promotion

---

## 📱 Role-Based UI/Dashboard Features

### **Superadmin Dashboard**
- System health metrics
- Tenant analytics
- User management
- Billing overview

### **Admin Dashboard**
- Tenant-wide analytics
- User management
- Role management
- System configuration
- Audit logs

### **Manager Dashboard**
- Team workload
- Project status
- SLA metrics
- Approval queue
- Time-off calendar

### **Technician Dashboard**
- My tasks/contracts
- My schedule
- Time tracking
- Incident assignments
- Maintenance queue

### **Viewer Dashboard**
- Project overview
- Status dashboard
- Reports
- Analytics (read-only)

---

## 🛡️ Security Best Practices

### 1. **Least Privilege Principle**
- Začít s minimálními právy
- Expandovat jen když je nutné

### 2. **Automatic Scope Filtering**
- Všechny queries automaticky filtrují tenant_id
- Database-level constraints
- Policy validation

### 3. **Audit Logging**
```php
// Všechny role změny se logují
AuditLog::create([
    'user_id' => auth()->id(),
    'model_type' => 'User',
    'model_id' => $user->id,
    'event' => 'role_assigned',
    'new_values' => ['role_id' => $role->id],
]);
```

### 4. **Role Hierarchy Enforcement**
```php
// User nemůže přiřadit vyšší role než má sám
if (auth()->user()->role_level < $targetRole->level) {
    abort(403, 'Cannot assign higher role than your own');
}
```

### 5. **Session & Activity Tracking**
```php
// Track who accessed what and when
ActivityLog::create([
    'user_id' => auth()->id(),
    'action' => 'viewed_contracts',
    'subject_type' => 'Contract',
    'ip_address' => request()->ip(),
    'created_at' => now(),
]);
```

---

## 🚀 Implementace (Next Steps)

1. ✅ Role definition (tento dokument)
2. ⏭️ Permission configuration seeder
3. ⏭️ Policy classes (Laravel Policies)
4. ⏭️ Middleware pro role checking
5. ⏭️ UI components s role badges
6. ⏭️ Dashboard per-role customization

---

## 📝 Role Configuration File (config/roles.php)

```php
// config/roles.php
return [
    'roles' => [
        'superadmin' => [
            'label' => 'Super Administrator',
            'level' => 5,
            'color' => '#FF0000',
            'icon' => 'shield-crown',
            'description' => 'System administrator',
        ],
        'admin' => [
            'label' => 'Administrator',
            'level' => 4,
            'color' => '#FF6B6B',
            'icon' => 'shield-admin',
            'description' => 'Tenant administrator',
        ],
        'manager' => [
            'label' => 'Manager',
            'level' => 3,
            'color' => '#FFA500',
            'icon' => 'shield-manager',
            'description' => 'Department manager',
        ],
        'technician' => [
            'label' => 'Technician',
            'level' => 2,
            'color' => '#4CAF50',
            'icon' => 'wrench',
            'description' => 'Field technician',
        ],
        'viewer' => [
            'label' => 'Viewer',
            'level' => 1,
            'color' => '#9E9E9E',
            'icon' => 'eye',
            'description' => 'Read-only access',
        ],
    ],
    
    'scopes' => [
        'own_resources' => ['technician', 'viewer'],
        'department' => ['technician', 'manager'],
        'tenant' => ['admin', 'manager', 'technician', 'viewer'],
        'system' => ['superadmin'],
    ],
];
```

---

## ✨ Shrnutí

| Role | Level | Scope | Use Case |
|------|-------|-------|----------|
| **Superadmin** | 5 | System | System owner, IT admin |
| **Admin** | 4 | Tenant | Tenant admin, Operations lead |
| **Manager** | 3 | Department | Team leads, Project managers |
| **Technician** | 2 | Own/Assigned | Field workers, Technicians |
| **Viewer** | 1 | View-only | Clients, Observers |

**Flexibilita:** Custom role mohou být vytvořeny dle potřeby s jakýmkoliv kombinacemi oprávnění.

---

**Tento návrh je připraven k implementaci!** 🎉

