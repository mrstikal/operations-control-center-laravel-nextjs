<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventSnapshot extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'aggregate_type',
        'aggregate_id',
        'version',
        'state',
        'created_at',
    ];

    protected $casts = [
        'state' => 'json',
        'created_at' => 'datetime',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this snapshot belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter by aggregate.
     */
    public function scopeForAggregate($query, $aggregateType, $aggregateId)
    {
        return $query->where('aggregate_type', $aggregateType)
            ->where('aggregate_id', $aggregateId);
    }

    /**
     * Scope to get latest snapshot for aggregate.
     */
    public function scopeLatestFor($query, $aggregateType, $aggregateId)
    {
        return $query->where('aggregate_type', $aggregateType)
            ->where('aggregate_id', $aggregateId)
            ->latest('version')
            ->first();
    }
}

