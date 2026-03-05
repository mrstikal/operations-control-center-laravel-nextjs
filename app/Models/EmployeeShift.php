<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeShift extends Model
{
    protected $fillable = [
        'employee_id',
        'shift_id',
        'start_date',
        'end_date',
        'is_active',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the employee profile.
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class);
    }

    /**
     * Get the shift.
     */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    // ========== METHODS ==========

    /**
     * Check if shift assignment is active.
     */
    public function isCurrentlyActive(): bool
    {
        $today = now()->toDateString();
        return $this->is_active
            && $this->start_date->toDateString() <= $today
            && (!$this->end_date || $this->end_date->toDateString() >= $today);
    }
}

