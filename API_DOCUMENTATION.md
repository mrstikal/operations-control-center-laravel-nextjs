# 📡 API Documentation - Operations Control Center

## 🚀 Quick Start

### Base URL
```
http://localhost:8000/api
```

### Authentication
Všechny protected endpoints vyžadují `Authorization` header:
```
Authorization: Bearer {token}
```

---

## 🔐 Authentication Endpoints

### POST /login
Přihlášení uživatele

**Request:**
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.local",
    "password": "password"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@test.local",
      "roles": [
        {
          "id": 1,
          "name": "Admin",
          "level": 4
        }
      ]
    },
    "token": "1|abc123xyz..."
  }
}
```

### POST /register
Registrace nového uživatele

**Request:**
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@company.com",
    "password": "password123",
    "password_confirmation": "password123",
    "phone": "+420123456789"
  }'
```

### GET /me
Vrátí aktuálního přihlášeného uživatele

**Request:**
```bash
curl -X GET http://localhost:8000/api/me \
  -H "Authorization: Bearer {token}"
```

### POST /logout
Odhlášení (revokace tokenu)

**Request:**
```bash
curl -X POST http://localhost:8000/api/logout \
  -H "Authorization: Bearer {token}"
```

---

## 📋 Contracts API

### GET /contracts
Vrátí seznam kontraktů s paginací

**Query Parameters:**
- `per_page` (int, default: 15)
- `status` (draft|approved|in_progress|blocked|done)
- `priority` (low|medium|high|critical)
- `search` (string, fulltext search)

**Request:**
```bash
curl -X GET 'http://localhost:8000/api/contracts?status=in_progress&per_page=10' \
  -H "Authorization: Bearer {token}"
```

**Response (200):**
```json
{
  "success": true,
  "message": "Contracts retrieved successfully",
  "data": [
    {
      "id": 1,
      "contract_number": "CNT-001",
      "title": "Web Development",
      "status": "in_progress",
      "priority": "high",
      "sla_status": "on_track",
      "budget": 50000,
      "spent": 25000,
      "budget_usage_percent": 50,
      "is_overdue": false
    }
  ],
  "pagination": {
    "total": 25,
    "per_page": 10,
    "current_page": 1,
    "last_page": 3
  }
}
```

### POST /contracts
Vytvoření nového kontraktu

**Required permission:** `contracts.create`

**Request:**
```bash
curl -X POST http://localhost:8000/api/contracts \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "contract_number": "CNT-025",
    "title": "Mobile App Development",
    "description": "Building iOS and Android apps",
    "priority": "high",
    "assigned_to": 2,
    "due_date": "2026-04-30",
    "sla_hours": 160,
    "budget": 75000
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Contract created successfully",
  "data": {
    "id": 25,
    "contract_number": "CNT-025",
    "title": "Mobile App Development",
    "status": "draft",
    ...
  }
}
```

### GET /contracts/{id}
Vrátí detail kontraktu

**Request:**
```bash
curl -X GET http://localhost:8000/api/contracts/1 \
  -H "Authorization: Bearer {token}"
```

### PUT /contracts/{id}
Aktualizace kontraktu

**Request:**
```bash
curl -X PUT http://localhost:8000/api/contracts/1 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "priority": "critical",
    "spent": 30000
  }'
```

### DELETE /contracts/{id}
Smazání kontraktu (soft delete)

**Required permission:** `contracts.delete`

### POST /contracts/{id}/approve
Schválení kontraktu

**Required permission:** `contracts.approve`

**Request:**
```bash
curl -X POST http://localhost:8000/api/contracts/1/approve \
  -H "Authorization: Bearer {token}"
```

### POST /contracts/{id}/change-status
Změna statusu kontraktu

**Required permission:** `contracts.change_status`

**Request:**
```bash
curl -X POST http://localhost:8000/api/contracts/1/change-status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "reason": "Work started"
  }'
```

---

## 🚨 Incidents API

### GET /incidents
Vrátí seznam incidentů

**Query Parameters:**
- `status` (open|in_progress|escalated|resolved|closed)
- `severity` (low|medium|high|critical)
- `priority` (low|medium|high|critical)
- `sla_breached` (boolean)
- `search` (string, fulltext search)

**Request:**
```bash
curl -X GET 'http://localhost:8000/api/incidents?severity=critical&status=open' \
  -H "Authorization: Bearer {token}"
```

### POST /incidents
Vytvoření nového incidentu

**Required permission:** `incidents.create`

**Request:**
```bash
curl -X POST http://localhost:8000/api/incidents \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Server Down",
    "description": "Production server is not responding",
    "category": "infrastructure",
    "severity": "critical",
    "priority": "critical",
    "assigned_to": 2,
    "sla_response_minutes": 15,
    "sla_resolution_minutes": 120
  }'
```

### GET /incidents/{id}
Vrátí detail incidentu s timeline a assignmenty

**Request:**
```bash
curl -X GET http://localhost:8000/api/incidents/1 \
  -H "Authorization: Bearer {token}"
```

### PUT /incidents/{id}
Aktualizace incidentu

### DELETE /incidents/{id}
Smazání incidentu (soft delete)

**Required permission:** `incidents.delete`

### POST /incidents/{id}/escalate
Eskalace incidentu

**Required permission:** `incidents.escalate`

**Request:**
```bash
curl -X POST http://localhost:8000/api/incidents/1/escalate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "escalated_to": 3,
    "escalation_level": "level_2",
    "reason": "Needs senior technician",
    "notes": "Complex infrastructure issue"
  }'
```

### POST /incidents/{id}/close
Uzavření incidentu

**Required permission:** `incidents.close`

**Request:**
```bash
curl -X POST http://localhost:8000/api/incidents/1/close \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution_summary": "Restarted server, applied patch, monitoring enabled"
  }'
```

---

## 🧰 Assets API

### GET /assets
Vrátí seznam assetů

**Query Parameters:**
- `status` (operational|maintenance|repair|retired|disposed)
- `category_id` (int)
- `location` (string)
- `due_for_maintenance` (boolean)
- `search` (string, fulltext search)

**Request:**
```bash
curl -X GET 'http://localhost:8000/api/assets?status=operational&due_for_maintenance=true' \
  -H "Authorization: Bearer {token}"
```

### POST /assets
Vytvoření nového asetu

**Required permission:** `assets.create`

**Request:**
```bash
curl -X POST http://localhost:8000/api/assets \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "name": "Dell Server",
    "asset_tag": "SRV-001",
    "serial_number": "ABC123XYZ",
    "location": "Data Center",
    "manufacturer": "Dell",
    "model": "PowerEdge R750",
    "acquisition_date": "2024-01-15",
    "warranty_expiry": "2027-01-15",
    "maintenance_interval_days": 90
  }'
```

### GET /assets/{id}
Vrátí detail asetu s maintenance logs

**Request:**
```bash
curl -X GET http://localhost:8000/api/assets/1 \
  -H "Authorization: Bearer {token}"
```

### PUT /assets/{id}
Aktualizace asetu

**Request:**
```bash
curl -X PUT http://localhost:8000/api/assets/1 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "maintenance",
    "utilization_percent": 75.5
  }'
```

### DELETE /assets/{id}
Smazání asetu (soft delete)

**Required permission:** `assets.delete`

### POST /assets/{id}/log-maintenance
Zaznamenání údržby asetu

**Required permission:** `assets.log_maintenance`

**Request:**
```bash
curl -X POST http://localhost:8000/api/assets/1/log-maintenance \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "preventive",
    "description": "Oil change and filter replacement",
    "hours_spent": 2.5,
    "cost": 150,
    "notes": "Regular maintenance",
    "parts_replaced": [
      {
        "part": "Oil",
        "quantity": 2,
        "cost": 50
      }
    ]
  }'
```

### POST /assets/{id}/schedule-maintenance
Naplánování údržby asetu

**Required permission:** `assets.schedule_maintenance`

**Request:**
```bash
curl -X POST http://localhost:8000/api/assets/1/schedule-maintenance \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "frequency": "quarterly",
    "interval_days": 90,
    "description": "Quarterly preventive maintenance"
  }'
```

---

## 👥 Users API

### GET /users
Vrátí seznam uživatelů tenanta

**Query Parameters:**
- `role` (name of role)
- `status` (active|inactive|on_leave)
- `search` (string, searches name and email)

**Request:**
```bash
curl -X GET 'http://localhost:8000/api/users?role=Manager' \
  -H "Authorization: Bearer {token}"
```

### GET /users/{id}
Vrátí detail uživatele

**Request:**
```bash
curl -X GET http://localhost:8000/api/users/1 \
  -H "Authorization: Bearer {token}"
```

### GET /users/profile/me
Vrátí profil aktuálně přihlášeného uživatele

**Request:**
```bash
curl -X GET http://localhost:8000/api/users/profile/me \
  -H "Authorization: Bearer {token}"
```

### PUT /users/{id}/update-profile
Aktualizace profilu uživatele

**Request:**
```bash
curl -X PUT http://localhost:8000/api/users/1/update-profile \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+420123456789",
    "bio": "Senior technician with 10 years experience",
    "avatar_url": "https://example.com/avatar.jpg",
    "preferences": {
      "language": "cs",
      "theme": "dark"
    }
  }'
```

### POST /users/{id}/assign-role
Přiřazení role uživateli

**Required permission:** `users.assign_role`

**Request:**
```bash
curl -X POST http://localhost:8000/api/users/5/assign-role \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": 3
  }'
```

### DELETE /users/{id}/remove-role/{roleId}
Odebrání role od uživatele

**Required permission:** `users.assign_role`

**Request:**
```bash
curl -X DELETE http://localhost:8000/api/users/5/remove-role/3 \
  -H "Authorization: Bearer {token}"
```

---

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Items retrieved",
  "data": [...],
  "pagination": {
    "total": 100,
    "per_page": 15,
    "current_page": 1,
    "last_page": 7,
    "from": 1,
    "to": 15
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error occurred",
  "errors": { ... }
}
```

### HTTP Status Codes
- `200` - OK
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

---

## 🔐 Permissions Required

Each endpoint enforces specific permissions. See ROLES_DESIGN.md for complete permission matrix.

Common permissions:
- `contracts.view` - View contracts
- `contracts.create` - Create contracts
- `contracts.edit` - Edit contracts
- `contracts.delete` - Delete contracts
- `incidents.view` - View incidents
- `incidents.create` - Create incidents
- `assets.view` - View assets
- `assets.log_maintenance` - Log maintenance

---

## 🧪 Testing with cURL

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.local","password":"password"}' \
  | jq -r '.data.token')

# Get contracts
curl -X GET http://localhost:8000/api/contracts \
  -H "Authorization: Bearer $TOKEN"

# Create incident
curl -X POST http://localhost:8000/api/incidents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "description": "Test incident",
    "category": "test",
    "severity": "high",
    "priority": "high"
  }'
```

---

**API je připravena k použití!** 🚀

