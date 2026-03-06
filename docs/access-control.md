# Access control

Operations Control Center uses a **role-based access control (RBAC)** model with **granular permissions**.

The goal is not only to restrict API actions, but also to control:

- what navigation items users can see
- which modules are visible
- which actions are enabled
- and which records can be viewed, edited, deleted, approved, or escalated

In practice, this means the authorization model shapes both the **backend behavior** and the **frontend experience**.

---

## Authorization model

Permissions are structured by:

- **resource**
- **action**

Examples:

```text
contracts.view
contracts.create
contracts.edit
contracts.delete
contracts.approve
contracts.change_status

assets.view
assets.create
assets.edit
assets.delete
assets.log_maintenance
assets.schedule_maintenance

incidents.view
incidents.create
incidents.edit
incidents.delete
incidents.escalate
incidents.close
incidents.comment
```

Additional resource groups include:

- `users`
- `hr`
- `reports`
- `notifications`
- `settings`
- `system`

---

## Tenant-aware authorization

OCC is not only role-aware, but also **tenant-aware**.

That matters because access is shaped by two dimensions:

1. **who the user is**
2. **which tenant scope the user is operating in**

So even when two users have similar role names, their effective access may still depend on tenant context, assigned data, or the scope of the current operation.

This is especially important in a multi-tenant operational system, where authorization is not just about generic feature access, but also about **which tenant’s data a user is allowed to work with**.

---

## Roles

### Superadmin

Highest-level role with full access across the system, including system-level capabilities.

Typical abilities:

- full CRUD across modules
- settings and role management
- system configuration
- audit visibility
- high-level system administration

---

### Admin

Broad tenant-wide administration role.

Typical abilities:

- wide access across operational modules
- user management
- role assignment
- settings access
- broad control within tenant scope

---

### Manager

Operational management role for day-to-day oversight.

Typical abilities:

- broad visibility into contracts, assets, incidents, HR, reports, and notifications
- create/edit capabilities in multiple domains
- approval and workflow actions where applicable
- limited settings visibility compared with higher administrative roles

---

### Technician

Operational role focused on execution rather than administration.

Typical abilities:

- view operational data
- create and update incidents
- participate in maintenance-related workflows
- work with selected operational records
- access a narrower action set than management roles

---

### Viewer

Basic read-only role.

Typical abilities:

- read-only access to selected modules
- no create/edit/delete actions

---

## Specialized viewer roles

### Viewer – Management

Read-only access intended for leadership and strategic oversight.

Typical abilities:

- broad read access across operational and reporting areas
- export access where appropriate
- no operational editing privileges

---

### Viewer – Auditor

Read-only access oriented toward compliance and review.

Typical abilities:

- view selected business records
- export reports
- access audit-related information
- no day-to-day operational modification rights

---

### Viewer – Client

Restricted external-style read-only role.

Typical abilities:

- visibility limited to own or assigned records
- reduced access compared with internal users
- no operational editing privileges
- narrower metric visibility in some scenarios

---

## HR module access

The HR module in OCC is intentionally lightweight, but it still demonstrates several useful permission boundaries.

Typical HR-related capabilities include:

- **viewing employees**
- **managing employees**
- **managing shifts**
- **approving time-off**
- **managing workload**

Examples of role differences:

- **Superadmin / Admin**
    - broad access to HR-related data and actions
- **Manager**
    - typically able to view employees, manage shifts, approve time-off, and work with workload planning
- **Technician**
    - usually limited to narrower HR-related visibility or workload-related access
- **Viewer roles**
    - read-only access where permitted, usually with no approval or management actions

This is useful because it shows that authorization in OCC is not limited to classic CRUD modules. It also covers workforce-oriented operational processes, where visibility and approval rights are often different from edit/delete rights.

---

## Visibility vs action permissions

The system distinguishes between different types of access.

### 1. Module visibility

A user may or may not see a section of the application at all.

Examples:

- can the user see the Contracts page?
- can the user access Reports?
- can the user view Settings?

### 2. Record actions

Even if a module is visible, action permissions can still differ.

Examples:

- a user may view contracts but not approve them
- a user may edit incidents but not delete them
- a user may view employees but not manage them

### 3. Scoped access

Some roles may be limited to:

- their own records
- assigned records
- tenant-wide data
- system-wide data

This is especially relevant for:

- **Viewer – Client**
- **Viewer – Auditor**
- assignment-specific workflows
- tenant-limited operational views

---

## Common permission patterns

### Read-only

- `*.view`

### Data entry / creation

- `*.create`

### Modification

- `*.edit`

### Removal

- `*.delete`

### Workflow actions

Examples:

- `contracts.approve`
- `contracts.change_status`
- `incidents.escalate`
- `incidents.close`
- `assets.log_maintenance`
- `assets.schedule_maintenance`

### Administration

Examples:

- `users.assign_role`
- `settings.manage_roles`
- `system.view_audit_logs`
- `system.manage_tenants`
- `system.system_config`

---

## Practical examples

### Contracts

Possible distinctions:

- visible to multiple roles
- editable only by selected operational roles
- approval restricted to higher-level users

### Incidents

Possible distinctions:

- many operational users can view/create/edit
- escalation and closure reserved for selected roles
- comments may be broader than full edit privileges

### HR

Possible distinctions:

- employee data visible to management-oriented roles
- employee management restricted to selected roles
- time-off approval not available to basic viewers

### Reports

Possible distinctions:

- some roles can only view
- some can export
- some can create custom reports

---

## Frontend and backend enforcement

The project is designed so that access control is reflected in both layers.

### Frontend responsibilities

The frontend can:

- hide or show modules
- enable or disable actions
- tailor views and dashboards by role
- adjust available workflows to the current user context

### Backend responsibilities

The backend remains the final authority and is responsible for:

- validating authorization for protected actions
- enforcing tenant boundaries
- preventing bypass of UI restrictions
- rejecting unauthorized create/update/delete or workflow actions

This matters because a hidden button is not security by itself. The backend still decides what is allowed.

---

## Summary

The access model is intentionally more detailed than in many demo repositories. That is one of the project’s strengths:

- it reflects realistic enterprise-style permission design
- it supports multiple user personas
- it includes tenant-aware authorization concerns
- it covers both visibility and action-level restrictions
- and it helps demonstrate how a broader operational system can stay structured and controlled
```