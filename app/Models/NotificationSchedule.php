<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationSchedule extends Model
{
    use HasFactory;

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

    /**
     * Get the tenant that owns the notification schedule.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Scope a query to only include active notification schedules.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include notification schedules with a given trigger.
     */
    public function scopeByTrigger($query, $trigger)
    {
        return $query->where('trigger', $trigger);
    }
}
