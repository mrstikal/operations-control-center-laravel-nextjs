# 👥 User Roles - Implementační Guide

## 📖 Přehled

Operations Control Center má **5 základních systémových rolí** s granulárními oprávněními:

```
Superadmin (Level 5) - System owner
   ↓
Admin (Level 4) - Tenant admin  
   ↓
Manager (Level 3) - Department lead
   ↓
Technician (Level 2) - Field worker
   ↓
Viewer (Level 1) - Read-only
```

---

## 🚀 Implementace

### 1. Vytvořit Role a Permissions

```bash
# Run seeder
php artisan db:seed --class=RoleAndPermissionSeeder

# Ověření
php artisan tinker
> Role::count() // Should be 5
> Permission::count() // Should be 30+
```

### 2. Políf - Authorization

**app/Policies/ContractPolicy.php** už implementovány:
```php
authorize($contract, 'view');        // View policy
authorize($contract, 'update');      // Edit policy
authorize($contract, 'approve');     // Approve policy
```

### 3. Middleware - Route Protection

Registrovat middleware v **bootstrap/app.php**:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'check-permission' => \App\Http\Middleware\CheckPermission::class,
        'check-role' => \App\Http\Middleware\CheckRole::class,
        'tenant-isolation' => \App\Http\Middleware\EnforceTenantIsolation::class,
    ]);
})
```

### 4. Gates - Custom Access Logic

V AuthServiceProvider:
```php
Gate::define('can-approve-contracts', function (User $user) {
    return $user->hasPermission('contracts', 'approve');
});

// V controlleru:
if (Gate::denies('can-approve-contracts')) {
    abort(403);
}
```

---

## 💻 Praktické Příklady

### Kontrola v Routách

```php
// Middleware na route
Route::post('/contracts', [ContractController::class, 'store'])
    ->middleware('check-permission:contracts,create');

Route::get('/admin', [AdminController::class, 'index'])
    ->middleware('check-role:admin,manager');

// Group middleware
Route::middleware(['auth', 'tenant-isolation'])->group(function () {
    Route::resource('contracts', ContractController::class);
});
```

### Kontrola v Controllerech

```php
public function store(StoreContractRequest $request)
{
    // Kontrola via policy
    $this->authorize('create', Contract::class);
    
    // Nebo via gate
    if (Gate::denies('can-approve-contracts')) {
        abort(403);
    }

    // Vytvoření s tenant_id
    Contract::create([
        'tenant_id' => auth()->user()->tenant_id,
        // ... další data
    ]);
}

public function update(Contract $contract, UpdateContractRequest $request)
{
    // Policy automaticky checkuje tenant isolation
    $this->authorize('update', $contract);
    
    $contract->update($request->validated());
}
```

### Kontrola v Modelech

```php
// User model
if ($user->hasPermission('contracts', 'edit')) {
    // Povoleno
}

if ($user->hasRole('Manager')) {
    // Povoleno
}

if ($user->isAdmin()) {
    // Full access
}

// Role model
$contracts = Contract::with('permissions')
    ->where('status', 'draft')
    ->get();
```

### Kontrola v Views (Blade)

```blade
@can('create', App\Models\Contract::class)
    <button>Vytvořit Kontrakt</button>
@endcan

@if(auth()->user()->hasPermission('contracts', 'approve'))
    <button>Schválit</button>
@endif

@if(auth()->user()->isAdmin())
    <a href="/admin">Admin Panel</a>
@endif
```

---

## 🎯 Role Specifika

### **SUPERADMIN (Level 5)**

```php
// Všechno
$user = User::where('email', 'superadmin@test.local')->first();
$user->hasPermission('contracts', 'view');    // true
$user->hasPermission('system', 'manage_tenants'); // true
$user->isAdmin(); // true
```

### **ADMIN (Level 4)**

```php
$user = User::where('email', 'admin@test.local')->first();
$user->hasPermission('contracts', 'create');  // true
$user->hasPermission('users', 'assign_role'); // true
$user->hasPermission('system', 'manage_tenants'); // false
```

### **MANAGER (Level 3)**

```php
$user = User::where('email', 'manager@test.local')->first();
$user->hasPermission('contracts', 'approve'); // true
$user->hasPermission('hr', 'approve_timeoff'); // true
$user->hasPermission('users', 'assign_role'); // false
```

### **TECHNICIAN (Level 2)**

```php
$user = User::where('email', 'tech@test.local')->first();
$user->hasPermission('contracts', 'edit');    // true
$user->hasPermission('assets', 'log_maintenance'); // true
$user->hasPermission('users', 'create');      // false
```

### **VIEWER (Level 1)**

```php
$user = User::where('email', 'viewer@test.local')->first();
$user->hasPermission('contracts', 'view');    // true
$user->hasPermission('contracts', 'create');  // false
```

---

## 🔒 Bezpečnost

### Tenant Isolation

Všechny operace jsou automaticky scoped na tenant:

```php
// Automaticky: WHERE tenant_id = auth()->user()->tenant_id
$contracts = Contract::all();

// Pro cross-tenant (admin only):
$contracts = Contract::whereNull('tenant_id')->get();
```

### Role Hierarchy

Uživatel nemůže přiřadit vyšší roli než má:

```php
// V policy
if ($targetUserLevel > $authUserLevel) {
    return false; // Denied
}
```

### Audit Trail

Všechny role změny se logují:

```php
// Automaticky:
AuditLog::create([
    'user_id' => auth()->id(),
    'event' => 'role_assigned',
    'model_type' => 'User',
]);
```

---

## 📊 Permission Matrix

| Action | Superadmin | Admin | Manager | Technician | Viewer |
|--------|:--------:|:-----:|:-------:|:----------:|:------:|
| **Contracts** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ |
| create | ✅ | ✅ | ✅ | ❌ | ❌ |
| edit | ✅ | ✅ | ✅ | ✅* | ❌ |
| delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| approve | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Assets** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ |
| log_maintenance | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Incidents** |
| view | ✅ | ✅ | ✅ | ✅ | ✅ |
| escalate | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Users** |
| view | ✅ | ✅ | ✅ | ✅ | ❌ |
| assign_role | ✅ | ✅ | ❌ | ❌ | ❌ |

\* Only assigned items

---

## 🛠️ Custom Roles

Vytvoření custom role:

```php
// Seed soubor nebo migration
$seniorTech = Role::create([
    'tenant_id' => $tenant->id,
    'name' => 'Senior Technician',
    'level' => 2.5, // Between Technician and Manager
    'is_system' => false,
]);

// Přiřazení specific permissions
$seniorTech->permissions()->attach([
    Permission::where('resource', 'incidents')->where('action', 'create')->first()->id,
    Permission::where('resource', 'assets')->where('action', 'create')->first()->id,
]);

// Přiřazení uživateli
$user->roles()->attach($seniorTech);
```

---

## 🚀 Testing

```php
// Feature test
public function test_manager_can_approve_contracts()
{
    $manager = User::factory()->create();
    $manager->roles()->attach(Role::where('name', 'Manager')->first());
    
    $contract = Contract::factory()->create();
    
    $this->actingAs($manager)
        ->post("/contracts/{$contract->id}/approve")
        ->assertSuccessful();
}

// Unit test
public function test_technician_cannot_delete_contracts()
{
    $tech = User::factory()->create();
    $tech->roles()->attach(Role::where('name', 'Technician')->first());
    
    $contract = Contract::factory()->create();
    
    $this->assertFalse($tech->hasPermission('contracts', 'delete'));
}
```

---

## 📚 Soubory Vytvořené

```
✅ ROLES_DESIGN.md (design dokument)
✅ RoleAndPermissionSeeder.php (updated - 5 role + 30+ permissions)
✅ app/Policies/BasePolicy.php
✅ app/Policies/ContractPolicy.php
✅ app/Policies/IncidentPolicy.php
✅ app/Policies/AssetPolicy.php
✅ app/Policies/UserPolicy.php
✅ app/Providers/AuthServiceProvider.php
✅ app/Http/Middleware/CheckPermission.php
✅ app/Http/Middleware/CheckRole.php
✅ app/Http/Middleware/EnforceTenantIsolation.php
✅ ROLES_IMPLEMENTATION.md (tento soubor)
```

---

## ✨ Shrnutí Implementace

### Setup
- ✅ 5 systémových rolí (Superadmin, Admin, Manager, Technician, Viewer)
- ✅ 30+ granulárních permissions
- ✅ Hierarchická struktura (level 1-5)

### Authorization
- ✅ Laravel Policies (model-based)
- ✅ Gates (action-based)
- ✅ Middleware (route-based)

### Security
- ✅ Tenant isolation
- ✅ Role hierarchy enforcement
- ✅ Audit logging
- ✅ Soft deletes

### Features
- ✅ Custom roles (non-system)
- ✅ Dynamic permissions
- ✅ Query scoping
- ✅ Policy morphing

---

## 🎉 Připraveno!

User roles systém je nyní plně implementován a připraven k použití.

**Příští kroky:**
1. API Controllers
2. Resources & Serialization
3. Request Validation
4. Error Handling
5. Frontend Integration (Next.js)

---

**Questions?** Viz **ROLES_DESIGN.md** pro podrobný design.

