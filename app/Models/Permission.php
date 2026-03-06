<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'description',
        'resource',
        'action',
    ];

    // ========== RELATIONS ==========

    /**
     * Get all roles with this permission.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_permissions');
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter permissions by resource.
     */
    public function scopeForResource($query, $resource)
    {
        return $query->where('resource', $resource);
    }

    // ========== METHODS ==========

    /**
     * Get the permission identifier (resource.action).
     */
    public function getIdentifier(): string
    {
        return "{$this->resource}.{$this->action}";
    }
}
