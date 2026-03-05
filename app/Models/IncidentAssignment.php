<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentAssignment extends Model
{
    public $timestamps = true;

    protected $fillable = [
        'incident_id',
        'user_id',
        'assigned_by',
        'role',
        'assignment_reason',
        'assigned_at',
        'unassigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'unassigned_at' => 'datetime',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the incident this assignment belongs to.
     */
    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    /**
     * Get the assigned user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who made the assignment.
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    // ========== METHODS ==========

    /**
     * Unassign this assignment.
     */
    public function unassign(): void
    {
        $this->update(['unassigned_at' => now()]);
    }

    /**
     * Check if assignment is active.
     */
    public function isActive(): bool
    {
        return is_null($this->unassigned_at);
    }
}

