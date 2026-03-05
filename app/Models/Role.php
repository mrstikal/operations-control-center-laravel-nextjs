<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Role extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'level',
        'metadata',
        'is_system',
    ];

    protected $casts = [
        'metadata' => 'json',
        'is_system' => 'boolean',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this role belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get all permissions for this role.
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions')
            ->withTimestamps();
    }

    /**
     * Get all users with this role.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_roles')
            ->withTimestamps();
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter roles by tenant.
     */
    public function scopeOfTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    // ========== METHODS ==========

    /**
     * Check if this is a system role.
     */
    public function isSystem(): bool
    {
        return $this->is_system;
    }

    /**
     * Get the level hierarchy.
     */
    public static function getLevelHierarchy($level): int
    {
        return match($level) {
            'admin' => 4,
            'manager' => 3,
            'technician' => 2,
            'viewer' => 1,
            default => 0,
        };
    }
}

