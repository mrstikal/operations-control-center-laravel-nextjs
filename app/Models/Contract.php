<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contract extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

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
     *
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        // Keep tenant context visible even when tenant is soft-deleted.
        return $this->belongsTo(Tenant::class)->withTrashed();
    }

    /**
     * Get the assigned user.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get the client user.
     *
     * @return BelongsTo<User, $this>
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
     * Scope to filter by status including deleted pseudo-status.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeFilterStatus(Builder $query, ?string $status): Builder
    {
        if ($status === 'deleted') {
            return $query->onlyTrashed();
        }

        if ($status) {
            return $query->where('status', $status);
        }

        return $query;
    }

    /**
     * Scope to filter by priority.
     */
    public function scopeFilterPriority(Builder $query, ?string $priority): Builder
    {
        if (! $priority) {
            return $query;
        }

        return $query->where('priority', $priority);
    }

    /**
     * Scope to filter by incidents presence.
     */
    public function scopeWithIncidentsPresence(Builder $query, ?string $presence): Builder
    {
        return match ($presence) {
            'with' => $query->has('incidents'),
            'without' => $query->doesntHave('incidents'),
            default => $query,
        };
    }

    /**
     * Scope to search contracts.
     */
    public function scopeSearch(Builder $query, ?string $search, string $driver): Builder
    {
        if (! $search) {
            return $query;
        }

        if ($driver === 'mysql') {
            return $query->whereRaw(
                'MATCH(title, description) AGAINST(? IN BOOLEAN MODE)',
                [$search]
            );
        }

        $like = '%'.$search.'%';

        return $query->where(function (Builder $innerQuery) use ($like): void {
            $innerQuery->where('title', 'like', $like)
                ->orWhere('description', 'like', $like);
        });
    }

    /**
     * Scope to apply API index sorting.
     */
    public function scopeSortForIndex(Builder $query, ?string $sortKey, string $sortDirection = 'asc'): Builder
    {
        return match ($sortKey) {
            'priority' => $query->orderByRaw(
                "CASE priority
                    WHEN 'low' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'high' THEN 3
                    WHEN 'critical' THEN 4
                    ELSE 999 END {$sortDirection}"
            ),
            'status' => $query->orderByRaw(
                "CASE status
                    WHEN 'draft' THEN 1
                    WHEN 'approved' THEN 2
                    WHEN 'in_progress' THEN 3
                    WHEN 'blocked' THEN 4
                    WHEN 'done' THEN 5
                    ELSE 999 END {$sortDirection}"
            ),
            'incidents_count' => $query->orderBy('incidents_count', $sortDirection),
            'due_date' => $query->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC')
                ->orderBy('due_date', $sortDirection),
            'budget' => $query->orderBy('budget', $sortDirection),
            default => $query->orderBy('created_at', 'desc'),
        };
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
            'from_status' => $oldStatus,
            'to_status' => $newStatus,
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
        if (! $this->budget) {
            return null;
        }

        return $this->budget - $this->spent;
    }

    /**
     * Get budget usage percentage.
     */
    public function getBudgetUsagePercent(): float
    {
        if (! $this->budget) {
            return 0;
        }

        return ($this->spent / $this->budget) * 100;
    }
}
