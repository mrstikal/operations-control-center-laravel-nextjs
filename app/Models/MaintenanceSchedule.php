<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class MaintenanceSchedule extends Model
{
    use SoftDeletes;

    public const DUE_STATE_OK = 'ok';

    public const DUE_STATE_DUE_SOON = 'due_soon';

    public const DUE_STATE_OVERDUE = 'overdue';

    protected $fillable = [
        'asset_id',
        'frequency',
        'interval_days',
        'description',
        'next_due_date',
        'is_active',
        'notification_settings',
        'due_state',
        'last_notified_at',
    ];

    protected $casts = [
        'next_due_date' => 'datetime',
        'is_active' => 'boolean',
        'notification_settings' => 'json',
        'last_notified_at' => 'datetime',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the asset this schedule belongs to.
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
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
     * Scope to filter overdue schedules.
     */
    public function scopeOverdue($query)
    {
        return $query->where('next_due_date', '<=', now())
            ->where('is_active', true);
    }

    /**
     * Scope: schedules needing due-state re-evaluation (active, not soft-deleted).
     */
    public function scopeForEvaluation($query)
    {
        return $query->active()->orderBy('next_due_date', 'asc');
    }

    // ========== METHODS ==========

    /**
     * Check if maintenance is overdue.
     */
    public function isOverdue(): bool
    {
        $nextDueDate = $this->getAttribute('next_due_date');

        return $nextDueDate instanceof Carbon && $nextDueDate->isPast();
    }

    /**
     * Get days until due.
     */
    public function daysUntilDue(): ?int
    {
        $nextDueDate = $this->getAttribute('next_due_date');
        if (! $nextDueDate instanceof Carbon) {
            return null;
        }

        return (int) now()->diffInDays($nextDueDate);
    }

    /**
     * Resolve how many days before due date a notification should fire.
     * Reads from notification_settings.days_before, defaults to 7.
     */
    public function notifyDaysBefore(): int
    {
        return (int) ($this->notification_settings['days_before'] ?? 7);
    }

    /**
     * Whether a notification was already sent for the current due_state
     * within the current due cycle (to avoid duplicate spam).
     */
    public function wasRecentlyNotified(): bool
    {
        $threshold = $this->next_due_date->copy()->subDays($this->notifyDaysBefore());

        return $this->last_notified_at instanceof Carbon
            && $this->last_notified_at->gte($threshold);
    }
}
