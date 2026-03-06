<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    protected $fillable = [
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
     * Get all employee assignments for this shift.
     */
    public function employees(): BelongsToMany
    {
        return $this->belongsToMany(EmployeeProfile::class, 'employee_shifts')
            ->withTimestamps();
    }

    /**
     * Get all employee shift assignments for this shift.
     *
     * @return HasMany<EmployeeShift, $this>
     */
    public function employeeShifts(): HasMany
    {
        return $this->hasMany(EmployeeShift::class, 'shift_id');
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
