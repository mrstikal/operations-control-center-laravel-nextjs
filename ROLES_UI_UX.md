# 🎨 User Roles - UI/UX Guide

## 📊 Role Hierarchy Visualization

```
┌─────────────────────────────────────────────────────┐
│                    SUPERADMIN (Level 5)             │
│              🔴 Full System Access                  │
│         System owner, IT administrator              │
│  [Red crown icon] - Rarest, highest authority       │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│                     ADMIN (Level 4)                 │
│            🔴 Tenant-Wide Access                    │
│   Tenant admin, operations lead                     │
│  [Red shield icon] - Manages entire tenant          │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│                    MANAGER (Level 3)                │
│             🟠 Department-Level Access              │
│    Team leads, project managers                     │
│  [Orange shield icon] - Leads teams/projects       │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│                   TECHNICIAN (Level 2)              │
│            🟢 Field-Level Access                    │
│    Mechanics, electricians, technicians             │
│  [Green wrench icon] - Performs practical work     │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│                     VIEWER (Level 1)                │
│            ⚪ Read-Only Access                      │
│    Clients, external auditors, observers            │
│  [Gray eye icon] - Visibility only                 │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Dashboard per Role

### SUPERADMIN Dashboard
```
┌──────────────────────────────────────────────────────┐
│ Operations Control Center                            │
│ Superadmin Dashboard          [Profile] [⚙️ Settings]│
├──────────────────────────────────────────────────────┤
│                                                      │
│  📊 SYSTEM OVERVIEW                                  │
│  ├─ Active Tenants: 5                                │
│  ├─ Total Users: 127                                 │
│  ├─ System Health: 98%                               │
│  └─ Last Backup: 2 hours ago                         │
│                                                      │
│  🏢 TENANT MANAGEMENT                                │
│  ├─ [+ Create New Tenant]                            │
│  └─ List of all tenants with status                  │
│                                                      │
│  👥 USER MANAGEMENT                                  │
│  ├─ [+ Create User]                                  │
│  ├─ Recent users                                     │
│  └─ System-wide audit log                            │
│                                                      │
│  🔧 SYSTEM CONFIG                                    │
│  ├─ Roles & Permissions                              │
│  ├─ Email & Notifications                            │
│  ├─ Billing & Subscriptions                          │
│  └─ API Keys                                         │
│                                                      │
│  📈 ANALYTICS                                        │
│  ├─ System Performance                               │
│  ├─ User Activity Heatmap                            │
│  └─ Error Logs                                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### ADMIN Dashboard
```
┌──────────────────────────────────────────────────────┐
│ Operations Control Center                            │
│ Test Company / Admin Dashboard    [Profile] [⚙️]    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📊 TENANT OVERVIEW                                  │
│  ├─ Active Users: 12                                 │
│  ├─ Projects: 8                                      │
│  ├─ Assets: 34                                       │
│  └─ Open Incidents: 3                                │
│                                                      │
│  👥 USER MANAGEMENT                                  │
│  ├─ [+ Create User]                                  │
│  ├─ [Users List & Roles]                             │
│  └─ Department Structure                             │
│                                                      │
│  🔐 PERMISSIONS                                      │
│  ├─ [Manage Roles]                                   │
│  ├─ [Custom Roles]                                   │
│  └─ Permission Matrix                                │
│                                                      │
│  📋 CONTRACTS                                        │
│  ├─ Total: 25                                        │
│  ├─ Draft: 2 | In Progress: 5 | Done: 18             │
│  └─ [View All]                                       │
│                                                      │
│  🧰 ASSETS                                           │
│  ├─ Total: 34                                        │
│  ├─ Operational: 30 | Maintenance: 2 | Retired: 2    │
│  └─ Due for Maintenance: 4                           │
│                                                      │
│  📊 REPORTS & ANALYTICS                              │
│  ├─ [System Logs]                                    │
│  ├─ [Audit Trail]                                    │
│  └─ [Performance Metrics]                            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### MANAGER Dashboard
```
┌──────────────────────────────────────────────────────┐
│ Operations Control Center                            │
│ Maintenance Team / Manager Dashboard   [Profile]     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  👥 MY TEAM                                          │
│  ├─ Team Members: 6                                  │
│  ├─ Available: 5 | On Leave: 1                       │
│  └─ Utilization: 87%                                 │
│                                                      │
│  📋 MY CONTRACTS                                     │
│  ├─ Total: 12                                        │
│  ├─ Awaiting Approval: 2 [👁️ Review]                │
│  ├─ In Progress: 4                                   │
│  └─ Blocked: 1 [⚠️ Attention]                        │
│                                                      │
│  📅 TIME-OFF REQUESTS                                │
│  ├─ Pending: 2 [👁️ Review]                          │
│  ├─ Approved This Month: 4                           │
│  └─ Calendar View                                    │
│                                                      │
│  🚨 INCIDENTS                                        │
│  ├─ Open: 3 [Critical: 1]                            │
│  ├─ Assigned to Team: 7                              │
│  └─ SLA Status: 1 At Risk                            │
│                                                      │
│  🧰 ASSETS                                           │
│  ├─ Due for Maintenance: 4                           │
│  ├─ Schedule Next: [Calendar]                        │
│  └─ Recent Logs: [List]                              │
│                                                      │
│  📊 TEAM METRICS                                     │
│  ├─ Productivity: 92%                                │
│  ├─ SLA Compliance: 98%                              │
│  └─ Average Response Time: 2.4h                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### TECHNICIAN Dashboard
```
┌──────────────────────────────────────────────────────┐
│ Operations Control Center                            │
│ John Technician / My Work Dashboard      [Profile]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📋 MY TASKS TODAY                                   │
│  ├─ [Contract CNT-045: Server Maintenance] (10h)    │
│  ├─ [Incident INC-123: Network Issue] (4h)          │
│  ├─ [Asset SRV-001: Preventive Maintenance] (3h)    │
│  └─ Total Allocated: 17 hours ⚠️ (Over capacity)    │
│                                                      │
│  📅 MY SCHEDULE                                      │
│  ├─ Shift: Day Shift (08:00 - 17:00)                │
│  ├─ Available Hours: 8                               │
│  ├─ Request Time Off [✎]                            │
│  └─ Next Week Schedule                               │
│                                                      │
│  🚨 ASSIGNED INCIDENTS                               │
│  ├─ Open (3):                                        │
│  │  ├─ INC-123: High priority (2.5h response time)  │
│  │  ├─ INC-125: Medium priority (6h response time)  │
│  │  └─ INC-127: Low priority (24h response time)    │
│  ├─ [View All] [Add Note]                            │
│  └─ SLA Status: 1 At Risk ⚠️                         │
│                                                      │
│  📊 MY PERFORMANCE                                   │
│  ├─ Tasks Completed: 18 this month                   │
│  ├─ Utilization: 94%                                 │
│  ├─ Quality Score: 4.8/5.0                           │
│  └─ Incident Response Time: 2.1h avg                │
│                                                      │
│  🔔 NOTIFICATIONS (5)                                │
│  ├─ New incident assigned                            │
│  ├─ Asset due for maintenance                        │
│  ├─ Time-off request approved                        │
│  └─ SLA breached on incident                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### VIEWER Dashboard
```
┌──────────────────────────────────────────────────────┐
│ Operations Control Center                            │
│ Client View / Dashboard                  [Profile]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📋 PROJECT STATUS                                   │
│  ├─ Project: Web Portal Upgrade                      │
│  ├─ Status: In Progress (45% complete)               │
│  ├─ Start Date: Feb 1, 2026                          │
│  ├─ Expected Completion: Mar 15, 2026                │
│  └─ Budget Usage: 32% ($16,000 / $50,000)            │
│                                                      │
│  📊 PROGRESS OVERVIEW                                │
│  ├─ Tasks:                                           │
│  │  ├─ Completed: 9                                  │
│  │  ├─ In Progress: 3                                │
│  │  └─ Pending: 2                                    │
│  │                                                  │
│  ├─ Timeline:                                        │
│  │  ├─ Design Phase: ✅ Complete                     │
│  │  ├─ Development: 🔄 In Progress                   │
│  │  ├─ Testing: ⏳ Pending                            │
│  │  └─ Deployment: ⏳ Pending                         │
│                                                      │
│  🚨 OPEN ISSUES                                      │
│  ├─ No critical issues                               │
│  ├─ 2 minor issues being resolved                    │
│  └─ [View Details]                                   │
│                                                      │
│  📈 KEY METRICS                                      │
│  ├─ SLA Compliance: 100%                             │
│  ├─ Response Time: 2.3h average                      │
│  ├─ Quality Score: 4.9/5.0                           │
│  └─ Team Satisfaction: 5.0/5.0                       │
│                                                      │
│  📞 SUPPORT                                          │
│  ├─ Account Manager: Jane Smith                      │
│  ├─ Contact: jane@company.com                        │
│  └─ [Send Message] [View Tickets]                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 🎨 Role Badge Styling

### Color Scheme
```
Superadmin  → #FF0000 (Red)      - Crown Icon 👑
Admin       → #FF6B6B (Red)      - Shield Icon 🛡️
Manager     → #FFA500 (Orange)   - Manager Icon 👔
Technician  → #4CAF50 (Green)    - Wrench Icon 🔧
Viewer      → #9E9E9E (Gray)     - Eye Icon 👁️
```

### Role Badge Component
```html
<!-- Blade template example -->
<div class="role-badge role-badge--{{ strtolower($user->roles->first()->name) }}">
    <span class="role-badge__icon">{{ $user->roles->first()->metadata['icon'] }}</span>
    <span class="role-badge__label">{{ $user->roles->first()->name }}</span>
</div>
```

### CSS Styling
```css
.role-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 500;
    font-size: 0.875rem;
}

.role-badge--superadmin {
    background-color: #FF0000;
    color: white;
}

.role-badge--admin {
    background-color: #FF6B6B;
    color: white;
}

.role-badge--manager {
    background-color: #FFA500;
    color: white;
}

.role-badge--technician {
    background-color: #4CAF50;
    color: white;
}

.role-badge--viewer {
    background-color: #9E9E9E;
    color: white;
}
```

---

## 🎯 Permission-Based UI Visibility

### Conditional Rendering
```blade
<!-- Show only for admins -->
@can('admin')
    <div class="admin-panel">
        <!-- Admin-only controls -->
    </div>
@endcan

<!-- Show only for managers and above -->
@if(auth()->user()->hasRole(['Manager', 'Admin', 'Superadmin']))
    <button class="approve-btn">Schválit</button>
@endif

<!-- Show for technician and above -->
@if(auth()->user()->hasPermission('contracts', 'edit'))
    <button class="edit-btn">Upravit</button>
@endif

<!-- Show for everyone -->
@can('view', $contract)
    <div class="contract-details">
        <!-- Contract info -->
    </div>
@endcan
```

---

## 🎬 UI Workflows per Role

### Creating a Contract

**Admin/Manager Flow:**
```
1. Click [+ Create Contract]
2. Fill form (title, assigned_to, budget, sla_hours)
3. [Draft] → [Save]
4. Status: Draft (Awaiting Approval)
```

**Technician Flow:**
```
❌ Cannot create contracts
✅ Can view and update assigned contracts
```

### Approving a Contract

**Manager Flow:**
```
1. Dashboard → "Awaiting Approval" (2)
2. Click contract
3. [👁️ Review] button visible
4. Add comment (optional)
5. [✅ Approve] or [❌ Reject]
```

**Technician Flow:**
```
❌ Approve button not visible
```

### Logging Maintenance

**Technician Flow:**
```
1. View Asset → [Log Maintenance]
2. Select type: preventive/corrective/inspection/repair
3. Enter hours_spent, cost, notes
4. [Attach Photo/Document]
5. [✅ Save]
```

**Viewer Flow:**
```
❌ Cannot log maintenance
✅ Can view maintenance history (read-only)
```

---

## 📱 Mobile/Responsive Considerations

### Role Indicator (Mobile)
```
Desktop: [👑 Superadmin]
Mobile:  [👑] (tooltip on hover)
```

### Action Menu (Mobile)
```
Desktop: [Edit] [Delete] [Approve]
Mobile:  [⋮] → [Edit, Delete, Approve]
```

---

## ✨ Role Transition Notifications

```
✉️ "Your role has been changed from Technician to Manager"
   - New permissions available
   - [Review new permissions]
   - [Refresh dashboard]

🔔 "New user added: john@company.com (Technician)"
   - View in user management
   - Send welcome email
```

---

## 📊 Administration Interface

### User Role Assignment
```
┌─────────────────────────────────┐
│ User Management / Edit User      │
├─────────────────────────────────┤
│                                 │
│ Name: John Technician           │
│ Email: john@company.com         │
│                                 │
│ Current Roles:                  │
│ ☑️ Technician                   │
│                                 │
│ Available Roles:                │
│ ☐ Superadmin (🔒 not eligible)  │
│ ☐ Admin (🔒 not eligible)       │
│ ☐ Manager                       │
│ ☑️ Technician (current)         │
│ ☑️ Viewer (default)             │
│                                 │
│ [Save Changes]                  │
│                                 │
└─────────────────────────────────┘
```

### Permission Matrix Viewer
```
┌──────────────────────────────────────────┐
│ Permissions / Role Viewer                │
├──────────────────────────────────────────┤
│                                          │
│ Filter: [All] [Contracts] [Assets]       │
│                                          │
│ Permission          │Admin│Manager│Tech  │
│ ─────────────────────┼─────┼───────┼──── │
│ contracts.view      │ ✅  │  ✅   │ ✅   │
│ contracts.create    │ ✅  │  ✅   │ ❌   │
│ contracts.edit      │ ✅  │  ✅   │ ✅   │
│ contracts.delete    │ ✅  │  ❌   │ ❌   │
│ contracts.approve   │ ✅  │  ✅   │ ❌   │
│ ─────────────────────┼─────┼───────┼──── │
│ assets.view         │ ✅  │  ✅   │ ✅   │
│ assets.log_maint.   │ ✅  │  ✅   │ ✅   │
│                                          │
└──────────────────────────────────────────┘
```

---

**Role UI/UX je nyní kompletně navrženo!** 🎨

