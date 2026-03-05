# 🔄 WebSocket Real-time Implementation Guide

## 📡 Co Je Vytvořeno

### Broadcasting Events (5 souborů)
```
✅ app/Events/ContractUpdated.php - Contract změny
✅ app/Events/IncidentUpdated.php - Incident změny
✅ app/Events/AssetUpdated.php - Asset změny
✅ app/Events/AlertTriggered.php - Alert notifikace
✅ app/Events/NotificationSent.php - User notifikace
✅ app/Events/DashboardStatsUpdated.php - Dashboard metrics
```

### Listeners (5 souborů)
```
✅ app/Listeners/BroadcastContractUpdated.php
✅ app/Listeners/BroadcastIncidentUpdated.php
✅ app/Listeners/BroadcastAssetUpdated.php
✅ app/Listeners/BroadcastAlertTriggered.php
✅ app/Listeners/BroadcastNotificationSent.php
```

### Infrastructure
```
✅ app/Providers/EventServiceProvider.php - Event registration
✅ routes/channels.php - Broadcasting channel authorization
✅ config/broadcasting.php - Broadcasting configuration
✅ app/Http/Middleware/BroadcastingAuthorization.php
✅ API routes with broadcasting auth endpoint
```

### Controllers Updated
```
✅ ContractController - Dispatchování events
  - create → broadcast ContractUpdated (created)
  - update → broadcast ContractUpdated (updated)
  - delete → broadcast ContractUpdated (deleted)
  - approve → broadcast ContractUpdated (approved)
  - changeStatus → broadcast ContractUpdated (status_changed)
```

---

## 🚀 Broadcasting Drivers

### Development (Testing)
```php
// .env
BROADCAST_DRIVER=log
```
Events se logují do `storage/logs/laravel.log`

### Production - Pusher
```php
// .env
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=your-app-id
PUSHER_APP_KEY=your-app-key
PUSHER_APP_SECRET=your-app-secret
PUSHER_HOST=api-mt.pusher.com
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_CLUSTER=mt
```

**Setup:**
1. Přihlásit se na https://pusher.com
2. Vytvořit novou aplikaci
3. Kopírovat credentials do .env

### Production - Ably (Alternativa)
```php
// .env
BROADCAST_DRIVER=ably
ABLY_KEY=your-ably-key
```

### Production - Redis
```php
// .env
BROADCAST_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

---

## 📡 Broadcasting Channels

### Public Channels
```php
// Jakýkoli uživatel se může přihlásit
Broadcast::channel('public.{roomId}', function ($user) {
    return true;
});
```

### Private Channels
```php
// Jen autentifikovaní uživatelé v tenanta
Broadcast::channel('tenant.{tenantId}.contracts', function ($user, $tenantId) {
    return (int) $user->tenant_id === (int) $tenantId;
});
```

### Presence Channels
```php
// Sledují kdo je v kanálu
Broadcast::channel('tenant.{tenantId}.admin', function ($user, $tenantId) {
    return (int) $user->tenant_id === (int) $tenantId && $user->isAdmin();
});
```

---

## 🎯 Real-time Events

### Contract Events
```php
// Contract created
ContractUpdated($contract, 'created')
// Channel: tenant.{tenantId}.contracts
// Event: contract.created

// Contract updated
ContractUpdated($contract, 'updated', ['title' => 'Old Title'])
// Channel: tenant.{tenantId}.contracts
// Event: contract.updated

// Contract deleted
ContractUpdated($contract, 'deleted')
// Channel: tenant.{tenantId}.contracts
// Event: contract.deleted

// Contract approved
ContractUpdated($contract, 'approved')
// Channel: tenant.{tenantId}.contracts
// Event: contract.approved

// Contract status changed
ContractUpdated($contract, 'status_changed', ['status' => 'in_progress'])
// Channel: tenant.{tenantId}.contracts
// Event: contract.status_changed
```

### Incident Events
```php
// Similar to contracts
IncidentUpdated($incident, 'created')
IncidentUpdated($incident, 'updated')
IncidentUpdated($incident, 'escalated')
IncidentUpdated($incident, 'closed')
```

### Asset Events
```python
# Similar pattern
AssetUpdated($asset, 'created')
AssetUpdated($asset, 'maintenance_logged')
AssetUpdated($asset, 'maintenance_scheduled')
```

### Alert Events
```python
# Alert triggered
AlertTriggered($alert)
# Channel: tenant.{tenantId}.alerts
# Event: alert.triggered

# Data sent
{
    'id': 1,
    'type': 'sla_breach',
    'severity': 'critical',
    'title': 'SLA Breached',
    'message': 'Contract CNT-001 SLA has been breached',
    'is_resolved': false,
    'created_at': '2026-03-05T...'
}
```

### Notification Events
```python
# User notification
NotificationSent($notification)
# Channel: user.{userId}
# Event: notification.sent

# Data
{
    'id': 1,
    'type': 'contract_approved',
    'title': 'Contract Approved',
    'message': 'Your contract has been approved',
    'is_read': false,
    'data': {...},
    'created_at': '2026-03-05T...'
}
```

---

## 💻 Frontend Integration (Next.js)

### Installation
```bash
npm install laravel-echo pusher-js
```

### Setup Echo Instance
```typescript
// lib/echo.ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

export const echo = new Echo({
    broadcaster: 'pusher',
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    encrypted: true,
    auth: {
        headers: {
            Authorization: `Bearer ${getAuthToken()}`,
        },
    },
});
```

### Subscribing to Channels
```typescript
// Subscribe to contract updates
echo.private(`tenant.${tenantId}.contracts`)
    .listen('ContractUpdated', (event) => {
        console.log('Contract updated:', event);
        // Update UI
        updateContractsList(event);
    });

// Subscribe to personal notifications
echo.private(`user.${userId}`)
    .listen('NotificationSent', (notification) => {
        console.log('New notification:', notification);
        // Show toast notification
        showNotification(notification.message);
    });

// Subscribe to alerts
echo.private(`tenant.${tenantId}.alerts`)
    .listen('AlertTriggered', (alert) => {
        console.log('Alert triggered:', alert);
        // Show alert modal
        showAlert(alert);
    });
```

### React Hook Example
```typescript
// hooks/useContractUpdates.ts
import { useEffect, useCallback } from 'react';
import { echo } from '@/lib/echo';

export function useContractUpdates(tenantId: number, callback: (event: any) => void) {
    useEffect(() => {
        const channel = echo.private(`tenant.${tenantId}.contracts`);

        const listener = channel
            .listen('ContractUpdated', callback)
            .listen('ContractCreated', callback);

        return () => {
            echo.leaveChannel(`tenant.${tenantId}.contracts`);
        };
    }, [tenantId, callback]);
}

// Usage
function ContractsList() {
    const [contracts, setContracts] = useState([]);

    useContractUpdates(1, (event) => {
        if (event.action === 'created') {
            setContracts([...contracts, event]);
        } else if (event.action === 'updated') {
            setContracts(contracts.map(c => c.id === event.id ? event : c));
        }
    });

    return <div>...</div>;
}
```

---

## 🔐 Security

### Broadcasting Authorization
```php
// routes/channels.php
Broadcast::channel('tenant.{tenantId}.contracts', function ($user, $tenantId) {
    // User musí být ze stejného tenanta
    return (int) $user->tenant_id === (int) $tenantId;
});
```

### Token Validation
```typescript
// Frontend - include token in auth header
const echo = new Echo({
    broadcaster: 'pusher',
    auth: {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    },
});
```

### Tenant Isolation
```
✅ Private channels s tenant_id
✅ User can only subscribe to own channels
✅ Middleware validates credentials
✅ Events only broadcast to authorized users
```

---

## 🧪 Testing Broadcasting

### Artisan Commands
```bash
# Test broadcast configuration
php artisan tinker
> event(new \App\Events\ContractUpdated($contract, 'created'));

# Check channels
> Illuminate\Support\Facades\Broadcast::routes();
```

### Test Broadcasting in Feature Tests
```php
public function test_contract_updated_broadcasts_event()
{
    $this->withoutExceptionHandling();
    
    Event::fake();
    
    $contract = Contract::factory()->create();
    $response = $this->actingAs($user)
        ->putJson("/api/contracts/{$contract->id}", [
            'title' => 'Updated',
        ]);
    
    Event::assertDispatched(ContractUpdated::class);
}
```

---

## 📊 Broadcasting Flow

```
User Updates Contract
    ↓
ContractController::update()
    ↓
$contract->update()
    ↓
broadcast(new ContractUpdated($contract, 'updated'))
    ↓
BROADCAST_DRIVER (Pusher/Redis/Log)
    ↓
Frontend Listening on Channel
    ↓
Echo.listen('ContractUpdated')
    ↓
Update UI in Real-time
```

---

## 🚀 Production Deployment

### Pusher Setup
1. https://pusher.com → Create account
2. Create application
3. Copy credentials to .env
4. Configure CORS if needed
5. Test with `artisan tinker`

### Redis Setup
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
redis-server

# Configure Laravel
# .env: BROADCAST_DRIVER=redis

# Start queue worker
php artisan queue:listen
```

### Environment Variables
```env
# Broadcasting
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_CLUSTER=

# Frontend
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
```

---

## 📈 Performance Tips

### Optimize Events
```php
// Use "broadcast" not "dispatch" for real-time
broadcast(new ContractUpdated($contract))->toOthers();

// Load only needed relationships
ContractUpdated($contract->load('assignedTo'))
```

### Throttle Events
```typescript
// Frontend - debounce heavy operations
const debouncedUpdate = debounce((event) => {
    updateUI(event);
}, 300);

echo.listen('ContractUpdated', debouncedUpdate);
```

### Scale with Redis
```php
// config/broadcasting.php
'redis' => [
    'driver' => 'redis',
    'connection' => 'default',
],
```

---

## 🎯 Next Steps

1. **Setup Broadcasting Driver**
   - [ ] Choose driver (Pusher/Redis/Ably)
   - [ ] Configure credentials
   - [ ] Test in development

2. **Implement Event Listeners**
   - [ ] Add events to IncidentController
   - [ ] Add events to AssetController
   - [ ] Add events to UserController

3. **Frontend Integration**
   - [ ] Install Laravel Echo
   - [ ] Setup Echo instance
   - [ ] Create React hooks
   - [ ] Test real-time updates

4. **Production Deployment**
   - [ ] Setup Redis cluster
   - [ ] Configure Pusher credentials
   - [ ] Load testing
   - [ ] Monitor performance

---

**WebSocket Real-time Implementation Ready!** 🚀

Stav:
- ✅ Broadcasting events created
- ✅ Channel authorization
- ✅ Event listeners setup
- ✅ API integration begun
- ⏳ Frontend integration (Next step)

