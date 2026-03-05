# 📊 Databázová Struktura - Operations Control Center

## 📋 Přehled Tabulek

### 🏢 Architektura Multi-Tenancy

- **tenants** - Jednolivé pracovní prostory/společnosti
  - `status`: active, suspended, inactive
  - `metadata`: JSON pro custom nastavení

---

## 🔐 Autentizace & Autorizace

### Users & Roles
- **users** - Uživatelé systému
  - Přidány pole: `tenant_id`, `employee_id`, `role`, `status`, `avatar_url`, `preferences`
  - Soft deletes pro historii
  
- **roles** - Definované role (admin, manager, technician, viewer)
  - `level`: hierarchická úroveň
  - `is_system`: systemové role nelze smazat

- **permissions** - Granulární oprávnění
  - `resource`: contracts, assets, incidents, etc.
  - `action`: view, create, edit, delete

- **role_permissions** - Mapování permissí na role
- **user_roles** - Přiřazení rolí uživatelům

---

## 📝 Zakázky / Projekty

### Contracts
```
Status Flow: draft → approved → in_progress → blocked → done
```

**Hlavní tabulky:**
- **contracts**
  - `contract_number`: Unique ID
  - `status`: Stavový automat
  - `priority`: low, medium, high, critical
  - `assigned_to`: Přiřazený technik
  - `sla_hours`, `sla_deadline`, `sla_status`: SLA sledování
  - `budget`, `spent`: Finanční tracking
  - `version`: Optimistic locking

- **contract_status_history** - Audit trail stavů
  - Zaznamenávání kdo, kdy a proč změnil stav

- **contract_incidents** - Incidenty связаní s kontraktem
  - Severity: low, medium, high, critical
  - Status: open, in_review, resolved, closed

---

## 👷 Lidské Zdroje (HR/Operační)

### Employees & Scheduling
- **employee_profiles**
  - `department`, `position`, `hire_date`
  - `available_hours_per_week`: Kapacita
  - `utilization_percent`: Vytížení
  - `skills`: JSON pole dovedností
  - `certifications`: JSON pole certifikací
  - `availability_status`: available, on_leave, on_maintenance, unavailable

- **shifts** - Pracovní směny
  - `start_time`, `end_time`
  - `days_of_week`: JSON [1,2,3,4,5] = Pondělí-Pátek
  - Tenant-specifické

- **employee_shifts** - Přiřazení směn zaměstnancům
  - Historické sledování (start_date, end_date)

- **time_off_requests** - Žádosti o volno
  - `type`: vacation, sick_leave, personal, other
  - `status`: pending, approved, rejected, cancelled
  - Approval workflow

- **workload** - Denní vytížení
  - `work_date`: Klíč
  - `hours_allocated` vs `hours_actual`
  - `capacity_utilization`: Procento
  - Možnost trackovat tasks v JSON

---

## 🧰 Asset Management

### Assets & Maintenance
- **asset_categories** - Kategorizace (stroje, zařízení, IT, atd.)

- **assets**
  - `asset_tag`: Unique identifikátor
  - `serial_number`: Výrobní číslo
  - `status`: operational, maintenance, repair, retired, disposed
  - `location`, `department`: Kde je asset
  - `acquisition_date`, `warranty_expiry`: Datumy
  - `last_maintenance`, `next_maintenance`: Tracking údržby
  - `maintenance_interval_days`: Automatické notifikace
  - `utilization_percent`: Vytížení
  - Soft deletes

- **maintenance_logs** - Kompletní historie servisů
  - `type`: preventive, corrective, inspection, repair
  - `performed_by`, `performed_at`: Kdo a kdy
  - `hours_spent`, `cost`: Náklady
  - `parts_replaced`: JSON seznam dílů

- **maintenance_schedules** - Plánovaná údržba
  - `frequency`: daily, weekly, monthly, quarterly, yearly, custom
  - `next_due_date`: Index pro notifikace
  - `notification_settings`: JSON pro upozornění

- **asset_audit_trail** - Audit trail všech změn
  - `old_values`, `new_values`: JSON
  - Kompletní historická evidence

---

## 🚨 Incident Management

### Incidents
- **incidents**
  - `incident_number`: Unique ID
  - `category`: Typ incidentu
  - `severity`: low, medium, high, critical
  - `priority`: Priorita řešení
  - `status`: open, in_progress, escalated, resolved, closed
  - `reported_by`, `assigned_to`, `escalated_to`: Role přiřazení
  - `contract_id`, `asset_id`: Vztahy
  - SLA sledování (response + resolution)
  - `sla_breached`: Boolean flag pro alerty
  - Soft deletes

- **incident_timeline** - Event log incidentu
  - Zaznamenává všechny změny a komentáře
  - `event_type`: status_changed, assigned, escalated, commented

- **incident_assignments** - Detailní přiřazení
  - `role`: primary, secondary, observer
  - Historické sledování (assigned_at, unassigned_at)

- **incident_escalations** - Workflow eskalace
  - `escalation_level`: level_1 až level_4
  - Sledování kdo, kdy a proč eskaloval

- **incident_comments** - Veřejné a interní poznámky
  - `is_internal`: Pro privátní poznámky
  - Soft deletes

---

## 📡 Event Sourcing & CQRS

### Events (Complete Audit Trail)
- **events** - Immutable event log
  - `event_type`: ContractCreated, StatusChanged, etc.
  - `aggregate_type`, `aggregate_id`: Co se změnilo
  - `payload`: JSON s kompletní daty
  - `correlation_id`, `causation_id`: Pro relace mezi eventy
  - `version`: Verze agregátu
  - Index na (aggregate_type, aggregate_id, version)

- **event_snapshots** - Performance optimalizace
  - Cachování stavu agregátu v určité verzi
  - Snížení počtu eventů potřebných k rekonstrukci stavu

- **event_projections** - CQRS read models
  - Tracking poslední zpracovaného eventu
  - `projection_name`: contracts_summary, incidents_dashboard, etc.
  - `is_active`: Lze vypnout bez migrace dat

---

## 📋 Audit & Compliance

### Audit Logs
- **audit_logs** - Centrální audit trail
  - `model_type`, `model_id`: Co se zmeniło
  - `event`: created, updated, deleted, restored
  - `old_values`, `new_values`: JSON diff
  - `ip_address`, `user_agent`, `url`, `method`: Kontext
  - Index na (model_type, model_id) a (user_id, created_at)

- **activity_logs** - User activity tracking
  - `action`: viewed, created, updated, deleted, commented
  - Méně detailní než audit_logs, více user-centric
  - Pro dashboard "Co se dělo"

---

## 🔔 Notifikace & Alerty

### Notifications
- **notifications** - User notifications
  - `type`: sla_breach, maintenance_due, incident_assigned, etc.
  - `read`: boolean tracking
  - `notifiable_type`, `notifiable_id`: Co se týká notifikace
  - `priority`: Vizuální filtace
  - `action_url`: Přímý link na akcí

- **notification_schedules** - Konfigurace notifikací
  - Tenant-specifické pravidla
  - `trigger`: Jaké akce triggerují notifikaci
  - `recipients`: Role-based nebo konkrétní uživatelé

- **alerts** - Systémové alerty
  - `alert_type`: sla_breach, high_utilization, maintenance_due
  - `status`: active, acknowledged, resolved
  - Eskalace pro kritické alerty
  - `severity`: info, warning, critical

---

## 🔎 Fulltext Search

### Search Index
- **search_index** - Centralizované vyhledávání
  - Agregace všech searchable obsahu
  - `searchable_text`: FULLTEXT index pro MySQL
  - Tenant-scoped
  - `indexable_type`, `indexable_id`: Vztah na původní tabulku

- **search_queries** - Analytics
  - Co uživatelé vyhledávají
  - `execution_time_ms`: Performance tracking
  - Analýza nejčastějších dotazů

---

## 📊 Indexy & Performance

### Strategické Indexy

**Contracts:**
```
(tenant_id, status, updated_at)
(tenant_id, priority, status)
(tenant_id, due_date, sla_status)
(assigned_to, status)
FULLTEXT(title, description)
```

**Incidents:**
```
(tenant_id, status, severity)
(tenant_id, priority, reported_at)
(assigned_to, status)
(sla_response_deadline, sla_breached)
(sla_resolution_deadline, sla_breached)
FULLTEXT(title, description)
```

**Assets:**
```
(tenant_id, status, next_maintenance)
(category_id, status)
(tenant_id, department)
(next_maintenance, status)
FULLTEXT(name, description, serial_number)
```

---

## 🔒 Optimistic Locking

Tabulky s concurrent update problémy obsahují `updated_version`:
- **contracts**: `updated_version` pro versioning
- **incidents**: `updated_version` pro versioning  
- **assets**: `updated_version` pro versioning

Implementace: Při UPDATE zkontrolovat zda `version` shoduje se aktuální.

---

## 🚀 Spuštění Migrací

```bash
# Všechny migrace
php artisan migrate

# Specificka migrace
php artisan migrate --path=/database/migrations/0001_01_01_000001_create_tenants_table.php

# Vrácení zpět
php artisan migrate:rollback

# Refresh (drop all + migrate)
php artisan migrate:refresh --seed
```

---

## 🔗 Entity Relationships

```
Tenants
├── Users (employee_profiles)
│   ├── Roles & Permissions
│   ├── Shifts (employee_shifts)
│   ├── Time Off Requests
│   └── Workload
├── Contracts
│   ├── Contract Incidents
│   └── Contract Status History
├── Assets
│   ├── Maintenance Logs
│   ├── Maintenance Schedules
│   └── Asset Audit Trail
├── Incidents
│   ├── Incident Timeline
│   ├── Incident Assignments
│   ├── Incident Escalations
│   └── Incident Comments
├── Events (Event Sourcing)
│   ├── Event Snapshots
│   └── Event Projections
├── Audit & Activity Logs
└── Notifications & Alerts
    └── Notification Schedules
```

---

## 📈 Soft Deletes

Tabulky s soft deletes (`deleted_at`):
- users
- roles  
- contracts
- contract_incidents
- employee_profiles
- shifts
- assets
- maintenance_schedules
- incidents
- incident_comments
- tenants

**Dotazy automaticky filtrují smazané záznamy, pokud nepoužijete `withTrashed()`.**

---

## 🎯 Multi-Tenant Isolation

Všechny tabulky (kromě základních systémových) obsahují `tenant_id` s:
- Foreign key constraint (cascadeOnDelete)
- Index pro queryScopingu

Implementace Query Scope v Modelech:
```php
protected static function booted()
{
    static::addGlobalScope(new TenantScope());
}
```

---

## 📝 Migrační Standardy

Všechny migrace jsou idempotentní a bezpečné:
- Funkce existenciality (`Schema::hasColumn()`)
- Duplikační constraints jsou UNIQUE
- Foreign keys s cascadeOnDelete nebo nullOnDelete
- Soft deletes všude kde je historii relevantní


