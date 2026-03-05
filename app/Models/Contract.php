<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contract extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'contract_number',
        'title',
        'description',
        'client_id',
        'assigned_to',
        'status',
        'priority',
        'start_date',
        'due_date',
        'completed_at',
        'sla_hours',
        'sla_deadline',
        'sla_status',
        'budget',
        'spent',
        'tags',
        'custom_fields',
        'version',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'due_date' => 'datetime',
        'completed_at' => 'datetime',
        'sla_deadline' => 'datetime',
        'budget' => 'decimal:2',
        'spent' => 'decimal:2',
        'tags' => 'json',
        'custom_fields' => 'json',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this contract belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the assigned user.
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get the client user.
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    /**
     * Get all incidents for this contract.
     */
    public function incidents(): HasMany
    {
        return $this->hasMany(ContractIncident::class);
    }

    /**
     * Get all status history changes.
     */
    public function statusHistory(): HasMany
    {
        return $this->hasMany(ContractStatusHistory::class)
            ->orderBy('changed_at', 'desc');
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter by tenant.
     */
    public function scopeOfTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope to filter by status.
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter SLA breached contracts.
     */
    public function scopeSlaBreach($query)
    {
        return $query->where('sla_status', 'breached');
    }

    /**
     * Scope to filter at-risk contracts.
     */
    public function scopeAtRisk($query)
    {
        return $query->where('sla_status', 'at_risk');
    }

    // ========== METHODS ==========

    /**
     * Change the contract status.
     */
    public function changeStatus($newStatus, $user, $reason = null): void
    {
        $oldStatus = $this->status;
        $this->update(['status' => $newStatus]);

        ContractStatusHistory::create([
            'contract_id' => $this->id,
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
            'changed_by' => $user->id,
            'reason' => $reason,
            'changed_at' => now(),
        ]);
    }

    /**
     * Check if contract is overdue.
     */
    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast();
    }

    /**
     * Get remaining budget.
     */
    public function getRemainingBudget()
    {
        if (!$this->budget) return null;
        return $this->budget - $this->spent;
    }

    /**
     * Get budget usage percentage.
     */
    public function getBudgetUsagePercent(): float
    {
        if (!$this->budget) return 0;
        return ($this->spent / $this->budget) * 100;
    }
}

