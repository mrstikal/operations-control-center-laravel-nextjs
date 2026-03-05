<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeOffRequest extends Model
{
    protected $fillable = [
        'employee_id',
        'start_date',
        'end_date',
        'type',
        'status',
        'requested_by',
        'approved_by',
        'reason',
        'approval_note',
        'requested_at',
        'decided_at',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'requested_at' => 'datetime',
        'decided_at' => 'datetime',
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
     * Get the user who requested.
     */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /**
     * Get the user who approved.
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter pending requests.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope to filter approved requests.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    // ========== METHODS ==========

    /**
     * Approve the request.
     */
    public function approve($user, $note = null): void
    {
        $this->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approval_note' => $note,
            'decided_at' => now(),
        ]);
    }

    /**
     * Reject the request.
     */
    public function reject($user, $reason): void
    {
        $this->update([
            'status' => 'rejected',
            'approved_by' => $user->id,
            'approval_note' => $reason,
            'decided_at' => now(),
        ]);
    }

    /**
     * Check if request is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
}

