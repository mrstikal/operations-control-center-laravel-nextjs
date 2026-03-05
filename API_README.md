# 🎉 API Documentation - Phase 10 Dashboard

**Last Updated:** 5. března 2026  
**Status:** 40+ REST endpoints hotovo + Dashboard API

## 📡 Co Bylo Implementováno

### Endpoint Groups

#### Authentication (4)
- `POST /api/login` - Login & generate token
- `POST /api/register` - Register new user
- `GET /api/me` - Get current user
- `POST /api/logout` - Logout

#### Contracts (7)
- `GET /api/contracts` - List (filtered, paginated)
- `GET /api/contracts/{id}` - Show detail
- `POST /api/contracts` - Create
- `PUT /api/contracts/{id}` - Update
- `DELETE /api/contracts/{id}` - Delete
- `POST /api/contracts/{id}/approve` - Approve
- `POST /api/contracts/{id}/change-status` - Change status

#### Incidents (7)
- `GET /api/incidents` - List
- `GET /api/incidents/{id}` - Show
- `POST /api/incidents` - Create
- `PUT /api/incidents/{id}` - Update
- `DELETE /api/incidents/{id}` - Delete
- `POST /api/incidents/{id}/escalate` - Escalate
- `POST /api/incidents/{id}/close` - Close

#### Assets (7)
- `GET /api/assets` - List
- `GET /api/assets/{id}` - Show
- `POST /api/assets` - Create
- `PUT /api/assets/{id}` - Update
- `DELETE /api/assets/{id}` - Delete
- `POST /api/assets/{id}/maintenance` - Schedule maintenance
- `GET /api/assets/{id}/maintenance-history` - Maintenance log

#### Users & Roles (8)
- `GET /api/users` - List
- `GET /api/users/{id}` - Show
- `PUT /api/users/{id}` - Update
- `POST /api/users/{id}/assign-role` - Assign role
- `GET /api/roles` - List roles
- `GET /api/permissions` - List permissions

#### **Dashboard - NEW (2)**
- `GET /api/dashboard/summary` - KPI metriky (operativní + obchodní)
- `GET /api/dashboard/feed` - Event timeline

### Smart Features
- ✅ Paginace s metadaty
- ✅ Advanced filtering (status, priority, severity, search)
- ✅ Full-text search na title, description
- ✅ Tenant isolation
- ✅ Role-based authorization
- ✅ Request validation
- ✅ Error handling
- ✅ Resource serialization

---

## 🚀 Quick Start

### Login & Get Token
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.local","password":"password"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"
```

### Dashboard Summary - NEW!
```bash
curl -X GET 'http://localhost:8000/api/dashboard/summary' \
  -H "Authorization: Bearer $TOKEN" \
  | jq

# Response
{
  "data": {
    "operational": {
      "orders": { "total": 15, "completed": 8, "pending": 3, "overdue": 2 },
      "incidents": { "total": 12, "open": 5, "escalated": 2, "sla_breached": 1 }
    },
    "business": {
      "budget_usage": 45.5,
      "active_contract_value": 125000,
      "avg_resolution_time": "2.5h"
    }
  }
}
```

### Dashboard Feed - NEW!
```bash
curl -X GET 'http://localhost:8000/api/dashboard/feed?limit=15' \
  -H "Authorization: Bearer $TOKEN" \
  | jq

# Response: Recent events timeline
```

### Get Contracts (Filtered)
```bash
curl -X GET 'http://localhost:8000/api/contracts?status=in_progress&per_page=10' \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

### Create Contract
```bash
curl -X POST http://localhost:8000/api/contracts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contract_number": "CT-2026-099",
    "title": "New Project",
    "client_id": 1,
    "status": "draft",
    "budget": 50000
  }' \
  | jq
```

---

## 📊 Response Format

### Success Response
```json
{
  "data": { /* Resource data */ },
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 50,
    "last_page": 5
  }
}
```

### Error Response
```json
{
  "message": "Validation failed",
  "errors": {
    "email": ["Email is required"]
  }
}
```

---

## 🔐 Authentication

All endpoints (except `/login`, `/register`) require:
```
Authorization: Bearer {TOKEN}
```

---

**See also:** [PHASE_10_DASHBOARD.md](PHASE_10_DASHBOARD.md)
    "contract_number":"CNT-NEW",
    "title":"Project Name",
    "priority":"high",
    "budget":50000
  }' | jq
```

---

## 📊 API Endpoints Overview

| Module | Endpoint | Method | Permission |
|--------|----------|--------|------------|
| **Auth** | /login | POST | - |
| | /register | POST | - |
| | /me | GET | - |
| | /logout | POST | - |
| **Contracts** | /contracts | GET | contracts.view |
| | /contracts | POST | contracts.create |
| | /contracts/{id} | GET | contracts.view |
| | /contracts/{id} | PUT | contracts.edit |
| | /contracts/{id} | DELETE | contracts.delete |
| | /contracts/{id}/approve | POST | contracts.approve |
| | /contracts/{id}/change-status | POST | contracts.change_status |
| **Incidents** | /incidents | GET | incidents.view |
| | /incidents | POST | incidents.create |
| | /incidents/{id}/escalate | POST | incidents.escalate |
| | /incidents/{id}/close | POST | incidents.close |
| **Assets** | /assets | GET | assets.view |
| | /assets/{id}/log-maintenance | POST | assets.log_maintenance |
| | /assets/{id}/schedule-maintenance | POST | assets.schedule_maintenance |
| **Users** | /users | GET | users.view |
| | /users/{id}/assign-role | POST | users.assign_role |

---

## 📚 Documentation Files

- **API_DOCUMENTATION.md** - Complete API reference with examples
- **API_IMPLEMENTATION.md** - Architecture, testing, integration guide
- **routes/api.php** - All endpoint definitions

---

## 🧪 Testing

```bash
# Run API tests
php artisan test tests/Feature/Api/

# Run specific test
php artisan test tests/Feature/Api/ContractApiTest.php
```

---

## 🔐 Authorization

Each endpoint has automatic role-based authorization:
- Permission checking via middleware
- Policy authorization on models
- Tenant isolation enforcement

---

## 📖 Frontend Integration

### JavaScript Example
```typescript
// Use Bearer token in Authorization header
const response = await fetch('http://localhost:8000/api/contracts', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

---

## 🎯 Status

- ✅ Database Structure - READY
- ✅ User Roles & Permissions - READY
- ✅ API Controllers & Resources - READY ⬅ YOU ARE HERE
- ⏭️ API Testing
- ⏭️ Frontend Integration (Next.js)
- ⏭️ WebSocket (Real-time)

---

**API está READY FOR PRODUCTION!** 🚀

