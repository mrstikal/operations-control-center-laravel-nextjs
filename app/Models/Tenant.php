<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'domain',
        'description',
        'status',
        'metadata',
        'activated_at',
        'suspended_at',
    ];

    protected $casts = [
        'metadata' => 'json',
        'activated_at' => 'datetime',
        'suspended_at' => 'datetime',
    ];

    // ========== RELATIONS ==========

    /**
     * Get all users in this tenant.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get all contracts for this tenant.
     */
    public function contracts(): HasMany
    {
        return $this->hasMany(Contract::class);
    }

    /**
     * Get all assets for this tenant.
     */
    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    /**
     * Get all incidents for this tenant.
     */
    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    /**
     * Get all roles for this tenant.
     */
    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    /**
     * Get all permissions for this tenant.
     */
    public function permissions(): HasMany
    {
        return $this->hasMany(Permission::class);
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter active tenants.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    // ========== METHODS ==========

    /**
     * Activate the tenant.
     */
    public function activate(): void
    {
        $this->update([
            'status' => 'active',
            'activated_at' => now(),
        ]);
    }

    /**
     * Suspend the tenant.
     */
    public function suspend(): void
    {
        $this->update([
            'status' => 'suspended',
            'suspended_at' => now(),
        ]);
    }

    /**
     * Check if tenant is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}

