<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected ?array $resolvedRoleNamesCache = null;

    /** @var array<string, bool> Per-instance cache for permission checks. */
    protected array $permissionCache = [];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'password',
        'employee_id',
        'phone',
        'bio',
        'avatar_url',
        'status',
        'last_login_at',
        'preferences',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'last_login_at' => 'datetime',
        'preferences' => 'json',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant that owns the user.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the employee profile for this user.
     *
     * @return HasOne<EmployeeProfile, $this>
     */
    public function employeeProfile(): HasOne
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    /**
     * Get the roles assigned to this user.
     *
     * @return BelongsToMany<Role, $this>
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles')
            ->withTimestamps();
    }

    /**
     * Get contracts assigned to this user.
     */
    public function assignedContracts(): HasMany
    {
        return $this->hasMany(Contract::class, 'assigned_to');
    }

    /**
     * Get incidents assigned to this user.
     */
    public function assignedIncidents(): HasMany
    {
        return $this->hasMany(Incident::class, 'assigned_to');
    }

    /**
     * Get notifications for this user.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter users by tenant.
     */
    public function scopeOfTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope to filter active users.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    // ========== METHODS ==========

    /**
     * Compatibility helper for controllers that call hasPermissionTo('resource.action').
     */
    public function hasPermissionTo(string $permission): bool
    {
        if (! str_contains($permission, '.')) {
            return false;
        }

        [$resource, $action] = explode('.', $permission, 2);

        if (! $resource || ! $action) {
            return false;
        }

        return $this->hasPermission($resource, $action);
    }

    /**
     * Check if user has a specific permission.
     */
    public function hasPermission($resource, $action): bool
    {
        // Superadmin has implicit full access regardless of granular permissions mapping.
        if ($this->isSuperadmin()) {
            return true;
        }

        $cacheKey = "{$resource}.{$action}";

        if (array_key_exists($cacheKey, $this->permissionCache)) {
            return $this->permissionCache[$cacheKey];
        }

        return $this->permissionCache[$cacheKey] = $this->roles()
            ->whereHas('permissions', function ($query) use ($resource, $action) {
                $query->where('resource', $resource)
                    ->where('action', $action);
            })
            ->exists();
    }

    /**
     * Check if user has a specific role or one of roles.
     */
    public function hasRole(string|array $roleName): bool
    {
        $roleNames = $this->roleNames();

        if (is_array($roleName)) {
            return collect($roleNames)->intersect($roleName)->isNotEmpty();
        }

        return in_array($roleName, $roleNames, true);
    }

    /**
     * Check if user is admin.
     */
    public function isAdmin(): bool
    {
        return $this->hasRole('Admin') || $this->isSuperadmin();
    }

    /**
     * Check if user is superadmin (RBAC or legacy role attribute fallback).
     */
    public function isSuperadmin(): bool
    {
        if ($this->hasRole('Superadmin')) {
            return true;
        }

        $legacyRole = $this->getAttribute('role');

        return is_string($legacyRole) && strcasecmp(trim($legacyRole), 'superadmin') === 0;
    }

    /**
     * Check if user is Viewer - Management (tenant-wide visibility).
     */
    public function isViewerManagement(): bool
    {
        return $this->hasRole('Viewer – Management');
    }

    /**
     * Check if user is Viewer - Auditor (assigned items only).
     */
    public function isViewerAuditor(): bool
    {
        return $this->hasRole('Viewer – Auditor');
    }

    /**
     * Check if user is Viewer - Client (own resources only).
     */
    public function isViewerClient(): bool
    {
        return $this->hasRole('Viewer – Client');
    }

    /**
     * Check if user is any type of Viewer.
     */
    public function isViewer(): bool
    {
        return $this->isViewerManagement()
            || $this->isViewerAuditor()
            || $this->isViewerClient();
    }

    /**
     * Get the highest role level.
     */
    public function getHighestRoleLevel(): float
    {
        return $this->roles()->max('level') ?? 0.0;
    }

    /**
     * Update last login timestamp.
     */
    public function updateLastLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }

    /**
     * Resolve default tenant context from user preferences.
     */
    public function getDefaultTenantId(): ?int
    {
        $preferences = $this->preferences;

        if (! is_array($preferences)) {
            return null;
        }

        $tenantId = $preferences['default_tenant_id'] ?? null;

        return is_numeric($tenantId) && (int) $tenantId > 0 ? (int) $tenantId : null;
    }

    /**
     * Persist default tenant context into user preferences.
     */
    public function setDefaultTenantId(int $tenantId): void
    {
        $preferences = is_array($this->preferences) ? $this->preferences : [];
        $preferences['default_tenant_id'] = $tenantId;

        $this->update(['preferences' => $preferences]);
    }

    /**
     * Resolve assigned role names with reuse of loaded relation when available.
     *
     * @return list<string>
     */
    private function roleNames(): array
    {
        if ($this->relationLoaded('roles')) {
            return $this->roles
                ->pluck('name')
                ->filter(fn ($name) => is_string($name) && $name !== '')
                ->values()
                ->all();
        }

        if ($this->resolvedRoleNamesCache !== null) {
            return $this->resolvedRoleNamesCache;
        }

        return $this->resolvedRoleNamesCache = $this->roles()
            ->pluck('name')
            ->filter(fn ($name) => is_string($name) && $name !== '')
            ->values()
            ->all();
    }

    /**
     * Safely load roles with permissions, avoiding relationship override issues.
     * Only loads relationships that aren't already loaded.
     *
     * @return $this
     */
    public function loadRolesWithPermissions()
    {
        // Load roles with permissions only if not already loaded
        if (! $this->relationLoaded('roles')) {
            $this->load(['roles' => fn ($q) => $q->with('permissions')]);
        } elseif ($this->roles->isNotEmpty() && ! $this->roles->first()->relationLoaded('permissions')) {
            // If roles are loaded but permissions are not, load permissions
            $this->roles->each(fn ($role) => $role->load('permissions'));
        }

        return $this;
    }

    /**
     * Get array of related models to load for API responses.
     * Uses with() for fresh queries and loads for already-loaded models.
     *
     * @return array
     */
    public static function withApiRelations()
    {
        return ['roles' => fn ($q) => $q->with('permissions'), 'employeeProfile'];
    }
}
