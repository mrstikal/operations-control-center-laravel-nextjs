<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MaintenanceSchedule extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'asset_id',
        'frequency',
        'interval_days',
        'description',
        'next_due_date',
        'is_active',
        'notification_settings',
    ];

    protected $casts = [
        'next_due_date' => 'datetime',
        'is_active' => 'boolean',
        'notification_settings' => 'json',
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

    // ========== METHODS ==========

    /**
     * Check if maintenance is overdue.
     */
    public function isOverdue(): bool
    {
        return $this->next_due_date && $this->next_due_date->isPast();
    }

    /**
     * Get days until due.
     */
    public function daysUntilDue(): ?int
    {
        if (!$this->next_due_date) return null;
        return (int) now()->diffInDays($this->next_due_date);
    }
}

