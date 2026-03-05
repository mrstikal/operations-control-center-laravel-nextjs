<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\AsJson;
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
        'tasks' => AsJson::class,
    ];

    // ========== RELATIONS ==========

    /**
     * Get the employee profile.
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
        if (!$this->employee || !$this->employee->available_hours_per_week) {
            return 0;
        }

        $dailyCapacity = $this->employee->available_hours_per_week / 5;
        return ($this->hours_allocated / $dailyCapacity) * 100;
    }
}

