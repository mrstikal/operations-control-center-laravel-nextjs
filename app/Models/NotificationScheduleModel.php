<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationScheduleModel extends Model
{
    protected $table = 'notification_schedules';

    protected $fillable = [
        'tenant_id',
        'name',
        'notification_type',
        'trigger',
        'conditions',
        'recipients',
        'is_active',
    ];

    protected $casts = [
        'conditions' => 'json',
        'recipients' => 'json',
        'is_active' => 'boolean',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this schedule belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter active schedules.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by trigger type.
     */
    public function scopeByTrigger($query, $trigger)
    {
        return $query->where('trigger', $trigger);
    }
}

