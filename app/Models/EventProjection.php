<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventProjection extends Model
{
    protected $fillable = [
        'tenant_id',
        'projection_name',
        'source_event_type',
        'last_processed_event_id',
        'last_processed_version',
        'projection_state',
        'is_active',
    ];

    protected $casts = [
        'projection_state' => 'json',
        'is_active' => 'boolean',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this projection belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter active projections.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by projection name.
     */
    public function scopeByName($query, $projectionName)
    {
        return $query->where('projection_name', $projectionName);
    }

    // ========== METHODS ==========

    /**
     * Update projection with new event.
     */
    public function updateProjection($eventId, $version, $newState = null): void
    {
        $this->update([
            'last_processed_event_id' => $eventId,
            'last_processed_version' => $version,
            'projection_state' => $newState ?? $this->projection_state,
        ]);
    }

    /**
     * Reset projection to process all events again.
     */
    public function reset(): void
    {
        $this->update([
            'last_processed_event_id' => 0,
            'last_processed_version' => 0,
            'projection_state' => null,
        ]);
    }
}

