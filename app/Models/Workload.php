<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Workload extends Model
{
    protected $fillable = [
        'employee_id',
        'work_date',
        'hours_allocated',
        'hours_actual',
        'capacity_utilization',
        'tasks',
    ];

    protected $casts = [
        'work_date' => 'date',
        'hours_allocated' => 'decimal:2',
        'hours_actual' => 'decimal:2',
        'capacity_utilization' => 'decimal:2',
        'tasks' => 'json',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the employee profile.
     *
     * @return BelongsTo<EmployeeProfile, $this>
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class);
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter by date range.
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('work_date', [$startDate, $endDate]);
    }

    /**
     * Scope to filter overutilized days.
     */
    public function scopeOverutilized($query)
    {
        return $query->where('capacity_utilization', '>', 100);
    }

    // ========== METHODS ==========

    /**
     * Calculate utilization percentage.
     */
    public function calculateUtilization(): float
    {
        $employee = $this->employee;

        if (! $employee) {
            return 0.0;
        }

        $availableHoursPerWeek = $employee->getAttribute('available_hours_per_week');
        if (! is_numeric($availableHoursPerWeek) || (float) $availableHoursPerWeek <= 0.0) {
            return 0.0;
        }

        $dailyCapacity = (float) $availableHoursPerWeek / 5;
        $hoursAllocated = $this->getAttribute('hours_allocated');

        return ((float) $hoursAllocated / $dailyCapacity) * 100;
    }
}
