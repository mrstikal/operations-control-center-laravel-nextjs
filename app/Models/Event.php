<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\AsJson;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Event extends Model
{
    protected $table = 'events';

    public $timestamps = true;

    protected $fillable = [
        'tenant_id',
        'event_type',
        'aggregate_type',
        'aggregate_id',
        'user_id',
        'payload',
        'metadata',
        'correlation_id',
        'causation_id',
        'version',
        'occurred_at',
    ];

    protected $casts = [
        'payload' => AsJson::class,
        'metadata' => AsJson::class,
        'occurred_at' => 'datetime',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this event belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who triggered this event.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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
     * Scope to filter by event type.
     */
    public function scopeByType($query, $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    /**
     * Scope to filter by correlation ID (grouped events).
     */
    public function scopeByCorrelation($query, $correlationId)
    {
        return $query->where('correlation_id', $correlationId);
    }

    // ========== METHODS ==========

    /**
     * Get all related events (by correlation ID).
     */
    public function getRelatedEvents()
    {
        if (!$this->correlation_id) {
            return collect([$this]);
        }

        return static::where('correlation_id', $this->correlation_id)
            ->orderBy('occurred_at', 'asc')
            ->get();
    }

    /**
     * Get event chronology (what caused this).
     */
    public function getCausation()
    {
        if (!$this->causation_id) {
            return null;
        }

        return static::find($this->causation_id);
    }
}

