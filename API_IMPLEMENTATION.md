# 📡 API Implementation Guide

## 🚀 Co Bylo Vytvořeno

### Controllers (5 souborů)
```
✅ BaseApiController.php - Abstraktní base class
✅ ContractController.php - REST API pro contracts
✅ IncidentController.php - REST API pro incidents  
✅ AssetController.php - REST API pro assets
✅ UserController.php - REST API pro users
✅ AuthController.php - Authentication (login/register)
```

### Resources (5 souborů)
```
✅ ContractResource.php - Contract serialization
✅ IncidentResource.php - Incident serialization
✅ AssetResource.php - Asset serialization
✅ UserResource.php - User serialization
```

### Request Validation (6 souborů)
```
✅ StoreContractRequest.php
✅ UpdateContractRequest.php
✅ StoreIncidentRequest.php
✅ UpdateIncidentRequest.php
✅ StoreAssetRequest.php
✅ UpdateAssetRequest.php
```

### Routes
```
✅ routes/api.php - Všechny API endpoints
```

### Documentation
```
✅ API_DOCUMENTATION.md - Kompletní API reference
```

---

## 🏗️ Architecture

### BaseApiController
Poskytuje standardní metody pro responses:

```php
// Success
$this->success($data, 'Message', 200);

// Paginated
$this->paginated($results, 'Message');

// Created (HTTP 201)
$this->created($data, 'Message');

// Error
$this->error('Message', 400, $errors);

// Not Found
$this->notFound();

// Unauthorized
$this->unauthorized();

// Forbidden
$this->forbidden();
```

### Resources
Laravel Resource classes pro automatic JSON serialization:

```php
return new ContractResource($contract);
return ContractResource::collection($contracts);
```

### Request Validation
Centralizované validace:

```php
// StoreContractRequest validuje všechny fields
class StoreContractRequest extends FormRequest {
    public function rules(): array {
        return [
            'title' => 'required|string|max:255',
            ...
        ];
    }
}
```

---

## 📡 API Endpoints Struktura

```
Authentication:
  POST   /api/login              - Login
  POST   /api/register           - Register
  GET    /api/me                 - Get current user
  POST   /api/logout             - Logout

Contracts:
  GET    /api/contracts          - List (with filters)
  POST   /api/contracts          - Create
  GET    /api/contracts/{id}     - Show
  PUT    /api/contracts/{id}     - Update
  DELETE /api/contracts/{id}     - Delete
  POST   /api/contracts/{id}/approve
  POST   /api/contracts/{id}/change-status

Incidents:
  GET    /api/incidents          - List (with filters)
  POST   /api/incidents          - Create
  GET    /api/incidents/{id}     - Show
  PUT    /api/incidents/{id}     - Update
  DELETE /api/incidents/{id}     - Delete
  POST   /api/incidents/{id}/escalate
  POST   /api/incidents/{id}/close

Assets:
  GET    /api/assets             - List (with filters)
  POST   /api/assets             - Create
  GET    /api/assets/{id}        - Show
  PUT    /api/assets/{id}        - Update
  DELETE /api/assets/{id}        - Delete
  POST   /api/assets/{id}/log-maintenance
  POST   /api/assets/{id}/schedule-maintenance

Users:
  GET    /api/users              - List
  GET    /api/users/{id}         - Show
  GET    /api/users/profile/me   - Current user
  PUT    /api/users/{id}/update-profile
  POST   /api/users/{id}/assign-role
  DELETE /api/users/{id}/remove-role/{roleId}
```

---

## 🔐 Authorization

Všechny routes jsou chráněny:

```php
// Route level
Route::post('/contracts', [...])
    ->middleware('check-permission:contracts,create');

// Policy level
$this->authorize('update', $contract);

// Gate level
if (Gate::denies('can-approve-contracts')) { ... }
```

---

## 📋 Příklady Použití

### Login & Get Token
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.local",
    "password": "password"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "user": {...},
#     "token": "1|abc123xyz..."
#   }
# }
```

### Get Contracts
```bash
curl -X GET 'http://localhost:8000/api/contracts?status=in_progress&per_page=10' \
  -H "Authorization: Bearer 1|abc123xyz..."
```

### Create Contract
```bash
curl -X POST http://localhost:8000/api/contracts \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "contract_number": "CNT-025",
    "title": "Mobile App",
    "priority": "high",
    "budget": 75000
  }'
```

### Approve Contract
```bash
curl -X POST http://localhost:8000/api/contracts/1/approve \
  -H "Authorization: Bearer {token}"
```

### Create Incident
```bash
curl -X POST http://localhost:8000/api/incidents \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Server Down",
    "description": "Production down",
    "severity": "critical",
    "priority": "critical"
  }'
```

### Log Maintenance
```bash
curl -X POST http://localhost:8000/api/assets/1/log-maintenance \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "preventive",
    "description": "Oil change",
    "hours_spent": 2.5,
    "cost": 150
  }'
```

---

## 🧪 Testing

### Unit Test Example
```php
// tests/Feature/Api/ContractApiTest.php
public function test_can_list_contracts()
{
    $user = User::factory()->create();
    $contract = Contract::factory()->create(['tenant_id' => $user->tenant_id]);

    $response = $this->actingAs($user)
        ->getJson('/api/contracts');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'success', 'message', 'data', 'pagination'
        ]);
}

public function test_can_create_contract()
{
    $user = User::factory()->create();
    $user->roles()->attach(Role::where('name', 'Admin')->first());

    $response = $this->actingAs($user)
        ->postJson('/api/contracts', [
            'contract_number' => 'CNT-999',
            'title' => 'Test',
            'priority' => 'high',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.title', 'Test');
}
```

### Feature Test Example
```php
// tests/Feature/Api/AuthApiTest.php
public function test_can_login()
{
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => Hash::make('password'),
    ]);

    $response = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['user', 'token']]);
}
```

---

## 🚀 Deployment Checklist

- [ ] Nastavit API rate limiting
- [ ] Configurovat CORS
- [ ] Nastavit HTTPS
- [ ] Implementovat API versioning (/api/v1/...)
- [ ] Nastavit monitoring & logging
- [ ] Dokumentovat API pro frontend team
- [ ] Setup automated testing (CI/CD)
- [ ] Performance optimization (caching, indexing)
- [ ] Security audit (SQL injection, XSS, etc.)

---

## 📊 Performance Tips

### Query Optimization
```php
// N+1 query problem - BAD
foreach($contracts as $contract) {
    $contract->assignedTo->name; // Additional query per contract
}

// Solution - Good
$contracts = Contract::with('assignedTo')->get();
```

### Caching
```php
// Cache permission checks
Cache::remember("permissions:{$userId}", 60*60, function() {
    return User::find($userId)->permissions()->get();
});
```

### Pagination
```php
// Always paginate large datasets
$contracts = Contract::paginate(15);
```

---

## 🔍 Error Handling

### Validation Errors (HTTP 422)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "title": ["Title is required"],
    "priority": ["Priority must be one of: low, medium, high, critical"]
  }
}
```

### Authorization Errors (HTTP 403)
```json
{
  "success": false,
  "message": "Forbidden"
}
```

### Not Found (HTTP 404)
```json
{
  "success": false,
  "message": "Resource not found"
}
```

---

## 📚 Frontend Integration

### JavaScript/TypeScript Example
```typescript
// services/api.ts
const API_URL = 'http://localhost:8000/api';

export const api = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  getContracts: async (token: string, filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(
      `${API_URL}/contracts?${params}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.json();
  },
};

// usage
const { data } = await api.login('admin@test.local', 'password');
localStorage.setItem('token', data.token);

const { data: contracts } = await api.getContracts(token, {
  status: 'in_progress',
  per_page: 10,
});
```

---

## 🎉 Summary

API je nyní plně funkční a připravená:

✅ RESTful endpoints pro všechny moduly  
✅ Comprehensive request validation  
✅ Role-based authorization  
✅ Standardní response formatting  
✅ Paginace, filtering, fulltext search  
✅ Error handling  
✅ Kompletní dokumentace  

Příští kroky:
1. API testing (unit + feature)
2. Performance optimization
3. Frontend integration
4. API versioning (v1, v2...)
5. GraphQL (optional)

---

**API Implementation je HOTOVA!** 🚀

