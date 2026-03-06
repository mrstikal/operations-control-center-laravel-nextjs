<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeProfile extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'department_id',
        'position',
        'hire_date',
        'available_hours_per_week',
        'utilization_percent',
        'skills',
        'certifications',
        'availability_status',
        'availability_until',
    ];

    protected $casts = [
        'hire_date' => 'date',
        'availability_until' => 'datetime',
        'available_hours_per_week' => 'integer',
        'utilization_percent' => 'decimal:2',
        'skills' => 'json',
        'certifications' => 'json',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the user this profile belongs to.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the department this profile belongs to (when FK is used).
     *
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get all shifts for this employee.
     *
     * @return HasMany<EmployeeShift, $this>
     */
    public function shifts(): HasMany
    {
        return $this->hasMany(EmployeeShift::class, 'employee_id');
    }

    /**
     * Get all time off requests.
     *
     * @return HasMany<TimeOffRequest, $this>
     */
    public function timeOffRequests(): HasMany
    {
        return $this->hasMany(TimeOffRequest::class, 'employee_id');
    }

    /**
     * Get workload records.
     *
     * @return HasMany<Workload, $this>
     */
    public function workload(): HasMany
    {
        return $this->hasMany(Workload::class, 'employee_id');
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter by department (name or ID).
     */
    public function scopeByDepartment($query, $department)
    {
        if (is_numeric($department)) {
            return $query->where('department_id', (int) $department);
        }

        return $query->whereHas('department', function ($q) use ($department) {
            $q->where('name', $department);
        });
    }

    /**
     * Scope to filter available employees.
     */
    public function scopeAvailable($query)
    {
        return $query->where('availability_status', 'available');
    }

    // ========== METHODS ==========

    /**
     * Set employee as on leave.
     */
    public function setOnLeave($until = null): void
    {
        $this->update([
            'availability_status' => 'on_leave',
            'availability_until' => $until,
        ]);
    }

    /**
     * Set employee as available.
     */
    public function setAvailable(): void
    {
        $this->update([
            'availability_status' => 'available',
            'availability_until' => null,
        ]);
    }

    /**
     * Check if employee is available.
     */
    public function isAvailable(): bool
    {
        return $this->availability_status === 'available';
    }

    /**
     * Get current shift.
     */
    public function getCurrentShift()
    {
        return $this->shifts()
            ->where('is_active', true)
            ->whereDate('start_date', '<=', now())
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', now());
            })
            ->latest('start_date')
            ->first();
    }
}
