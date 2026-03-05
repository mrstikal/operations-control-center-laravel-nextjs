<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Shift extends Model
{
    protected $fillable = [
        'tenant_id',
        'name',
        'start_time',
        'end_time',
        'days_of_week',
        'description',
        'is_active',
    ];

    protected $casts = [
        'days_of_week' => 'json',
        'is_active' => 'boolean',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this shift belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get all employee assignments for this shift.
     */
    public function employees(): BelongsToMany
    {
        return $this->belongsToMany(EmployeeProfile::class, 'employee_shifts')
            ->withTimestamps();
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter active shifts.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // ========== METHODS ==========

    /**
     * Check if shift is operating on a specific day.
     */
    public function operatesOnDay($dayOfWeek): bool
    {
        return in_array($dayOfWeek, $this->days_of_week ?? []);
    }

    /**
     * Get duration in hours.
     */
    public function getDurationHours(): float
    {
        $start = now()->startOfDay()->add('hours', (int) $this->start_time);
        $end = now()->startOfDay()->add('hours', (int) $this->end_time);
        return $start->diffInMinutes($end) / 60;
    }
}

