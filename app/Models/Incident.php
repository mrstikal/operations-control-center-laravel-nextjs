<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\AsJson;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Incident extends Model
{
    use HasFactory, SoftDeletes;

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
        'tags' => AsJson::class,
        'custom_fields' => AsJson::class,
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this incident belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the reporter.
     */
    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /**
     * Get the assigned user.
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get the escalated to user.
     */
    public function escalatedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'escalated_to');
    }

    /**
     * Get the related contract.
     */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    /**
     * Get the related asset.
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Get the timeline events.
     */
    public function timeline(): HasMany
    {
        return $this->hasMany(IncidentTimeline::class)
            ->orderBy('occurred_at', 'asc');
    }

    /**
     * Get the assignments.
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(IncidentAssignment::class);
    }

    /**
     * Get the escalations.
     */
    public function escalations(): HasMany
    {
        return $this->hasMany(IncidentEscalation::class)
            ->orderBy('escalated_at', 'desc');
    }

    /**
     * Get the comments.
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
    public function assignTo($user, $assignedBy, $role = 'primary'): void
    {
        IncidentAssignment::create([
            'incident_id' => $this->id,
            'user_id' => $user->id,
            'assigned_by' => $assignedBy->id,
            'role' => $role,
            'assigned_at' => now(),
        ]);

        if ($role === 'primary') {
            $this->update(['assigned_to' => $user->id]);
        }
    }

    /**
     * Escalate the incident.
     */
    public function escalate($escalatedBy, $escalatedTo, $level, $reason): void
    {
        IncidentEscalation::create([
            'incident_id' => $this->id,
            'escalated_by' => $escalatedBy->id,
            'escalated_to' => $escalatedTo->id,
            'escalation_level' => $level,
            'reason' => $reason,
            'escalated_at' => now(),
        ]);

        $this->update([
            'status' => 'escalated',
            'escalated_to' => $escalatedTo->id,
        ]);
    }

    /**
     * Add a comment to the incident.
     */
    public function addComment($user, $comment, $isInternal = false): IncidentComment
    {
        return $this->comments()->create([
            'user_id' => $user->id,
            'comment' => $comment,
            'is_internal' => $isInternal,
            'commented_at' => now(),
        ]);
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
        if (!$this->sla_resolution_deadline) return null;
        return max(0, (int) now()->diffInMinutes($this->sla_resolution_deadline));
    }
}

