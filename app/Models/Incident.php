<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Incident extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'incident_number',
        'title',
        'description',
        'category',
        'severity',
        'priority',
        'status',
        'reported_by',
        'assigned_to',
        'escalated_to',
        'contract_id',
        'asset_id',
        'reported_at',
        'acknowledged_at',
        'started_at',
        'resolved_at',
        'closed_at',
        'sla_response_minutes',
        'sla_resolution_minutes',
        'sla_response_deadline',
        'sla_resolution_deadline',
        'sla_breached',
        'tags',
        'resolution_summary',
        'custom_fields',
        'version',
    ];

    protected $casts = [
        'reported_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'started_at' => 'datetime',
        'resolved_at' => 'datetime',
        'closed_at' => 'datetime',
        'sla_response_deadline' => 'datetime',
        'sla_resolution_deadline' => 'datetime',
        'sla_breached' => 'boolean',
        'tags' => 'json',
        'custom_fields' => 'json',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this incident belongs to.
     *
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        // Include archived (soft-deleted) tenants so historical incident rows keep tenant context.
        return $this->belongsTo(Tenant::class)->withTrashed();
    }

    /**
     * Get the reporter.
     *
     * @return BelongsTo<User, $this>
     */
    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
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
     * Get the escalated to user.
     *
     * @return BelongsTo<User, $this>
     */
    public function escalatedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'escalated_to');
    }

    /**
     * Get the related contract.
     *
     * @return BelongsTo<Contract, $this>
     */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    /**
     * Get the related asset.
     *
     * @return BelongsTo<Asset, $this>
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Get the timeline events.
     *
     * @return HasMany<IncidentTimeline, $this>
     */
    public function timeline(): HasMany
    {
        return $this->hasMany(IncidentTimeline::class)
            ->orderBy('occurred_at', 'asc');
    }

    /**
     * Get the assignments.
     *
     * @return HasMany<IncidentAssignment, $this>
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(IncidentAssignment::class);
    }

    /**
     * Get the escalations.
     *
     * @return HasMany<IncidentEscalation, $this>
     */
    public function escalations(): HasMany
    {
        return $this->hasMany(IncidentEscalation::class)
            ->orderBy('escalated_at', 'desc');
    }

    /**
     * Get the comments.
     *
     * @return HasMany<IncidentComment, $this>
     */
    public function comments(): HasMany
    {
        return $this->hasMany(IncidentComment::class)
            ->orderBy('commented_at', 'desc');
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
     * Scope to filter by severity.
     */
    public function scopeFilterSeverity(Builder $query, ?string $severity): Builder
    {
        if (! $severity) {
            return $query;
        }

        return $query->where('severity', $severity);
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
     * Scope to filter by SLA breached flag.
     */
    public function scopeFilterSlaBreached(Builder $query, mixed $slaBreached): Builder
    {
        if ($slaBreached === null || $slaBreached === '' || $slaBreached === false) {
            return $query;
        }

        return $query->where('sla_breached', true);
    }

    /**
     * Scope to search incidents.
     */
    public function scopeSearch(Builder $query, ?string $search, string $driver): Builder
    {
        if (! $search) {
            return $query;
        }

        if ($driver === 'mysql') {
            return $query->whereRaw('MATCH(title, description) AGAINST(? IN BOOLEAN MODE)', [$search]);
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
            'severity' => $query->orderByRaw(
                "CASE severity
                    WHEN 'low' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'high' THEN 3
                    WHEN 'critical' THEN 4
                    ELSE 999 END {$sortDirection}"
            ),
            'status' => $query->orderByRaw(
                "CASE status
                    WHEN 'open' THEN 1
                    WHEN 'in_progress' THEN 2
                    WHEN 'escalated' THEN 3
                    WHEN 'resolved' THEN 4
                    WHEN 'closed' THEN 5
                    ELSE 999 END {$sortDirection}"
            ),
            default => $query->orderBy('reported_at', 'desc'),
        };
    }

    /**
     * Scope to filter open incidents.
     */
    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['open', 'in_progress', 'escalated']);
    }

    /**
     * Scope to filter SLA breached incidents.
     */
    public function scopeSlaBreach($query)
    {
        return $query->where('sla_breached', true);
    }

    /**
     * Scope to filter high priority incidents.
     */
    public function scopeHighPriority($query)
    {
        return $query->whereIn('priority', ['high', 'critical']);
    }

    // ========== METHODS ==========

    /**
     * Assign incident to a user.
     */
    public function assignTo($user, $assignedBy, $role = 'primary', ?string $reason = null): void
    {
        $assignment = IncidentAssignment::firstOrNew([
            'incident_id' => $this->id,
            'user_id' => $user->id,
            'role' => $role,
        ]);

        $assignment->assigned_by = $assignedBy->id;
        $assignment->assignment_reason = $reason;
        $assignment->assigned_at = now();
        $assignment->unassigned_at = null;
        $assignment->save();

        if ($role === 'primary') {
            $this->update(['assigned_to' => $user->id]);
        }

        $this->addTimelineEvent(
            $assignedBy,
            'assigned',
            sprintf('Incident assigned to %s (%s)', $user->name, $role),
            [
                'assigned_to' => $user->id,
                'role' => $role,
                'reason' => $reason,
            ]
        );
    }

    /**
     * Escalate the incident.
     */
    public function escalate($escalatedBy, $escalatedTo, $level, $reason, ?string $notes = null): void
    {
        IncidentEscalation::create([
            'incident_id' => $this->id,
            'escalated_by' => $escalatedBy->id,
            'escalated_to' => $escalatedTo->id,
            'escalation_level' => $level,
            'reason' => $reason,
            'notes' => $notes,
            'escalated_at' => now(),
        ]);

        $this->update([
            'status' => 'escalated',
            'escalated_to' => $escalatedTo->id,
        ]);

        // Escalation creates/refreshes primary assignment to the escalated user.
        $this->assignTo($escalatedTo, $escalatedBy, 'primary', $reason);

        $this->addTimelineEvent(
            $escalatedBy,
            'escalated',
            sprintf('Incident escalated to %s (%s)', $escalatedTo->name, $level),
            [
                'escalated_to' => $escalatedTo->id,
                'escalation_level' => $level,
                'reason' => $reason,
                'notes' => $notes,
            ]
        );
    }

    /**
     * Add a comment to the incident.
     */
    public function addComment($user, $comment, $isInternal = false): IncidentComment
    {
        $created = $this->comments()->create([
            'user_id' => $user->id,
            'comment' => $comment,
            'is_internal' => $isInternal,
            'commented_at' => now(),
        ]);

        $this->addTimelineEvent(
            $user,
            $isInternal ? 'note_added' : 'commented',
            $isInternal ? 'Internal note added' : 'Comment added',
            ['is_internal' => (bool) $isInternal]
        );

        return $created;
    }

    /**
     * Change incident status.
     */
    public function changeStatus($newStatus): void
    {
        $this->update(['status' => $newStatus]);

        if ($newStatus === 'resolved') {
            $this->update(['resolved_at' => now()]);
        } elseif ($newStatus === 'closed') {
            $this->update(['closed_at' => now()]);
        }
    }

    /**
     * Add a timeline event row.
     */
    public function addTimelineEvent($user, string $eventType, string $message, array $metadata = []): IncidentTimeline
    {
        return $this->timeline()->create([
            'user_id' => $user->id,
            'event_type' => $eventType,
            'message' => $message,
            'metadata' => empty($metadata) ? null : $metadata,
            'occurred_at' => now(),
        ]);
    }

    /**
     * Check if SLA response time is breached.
     */
    public function isResponseSlaBreach(): bool
    {
        return $this->sla_response_deadline && now()->isAfter($this->sla_response_deadline);
    }

    /**
     * Check if SLA resolution time is breached.
     */
    public function isResolutionSlaBreach(): bool
    {
        return $this->sla_resolution_deadline && now()->isAfter($this->sla_resolution_deadline);
    }

    /**
     * Get time elapsed since reporting.
     */
    public function timeElapsed(): int
    {
        return (int) $this->reported_at->diffInMinutes(now());
    }

    /**
     * Get remaining SLA time in minutes.
     */
    public function remainingSlaTime(): ?int
    {
        if (! $this->sla_resolution_deadline) {
            return null;
        }

        return max(0, (int) now()->diffInMinutes($this->sla_resolution_deadline));
    }
}
