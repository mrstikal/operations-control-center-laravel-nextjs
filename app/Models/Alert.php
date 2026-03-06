<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    protected $fillable = [
        'tenant_id',
        'alert_type',
        'subject',
        'message',
        'severity',
        'status',
        'source_type',
        'source_id',
        'triggered_by',
        'acknowledged_by',
        'triggered_at',
        'acknowledged_at',
        'resolved_at',
        'metadata',
    ];

    protected $casts = [
        'triggered_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'resolved_at' => 'datetime',
        'metadata' => 'json',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this alert belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who triggered this alert.
     */
    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }

    /**
     * Get the user who acknowledged this alert.
     */
    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter active alerts.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to filter critical alerts.
     */
    public function scopeCritical($query)
    {
        return $query->where('severity', 'critical');
    }

    /**
     * Scope to filter by source.
     */
    public function scopeForSource($query, $sourceType, $sourceId)
    {
        return $query->where('source_type', $sourceType)
            ->where('source_id', $sourceId);
    }

    // ========== METHODS ==========

    /**
     * Acknowledge the alert.
     */
    public function acknowledge($user): void
    {
        $this->update([
            'status' => 'acknowledged',
            'acknowledged_by' => $user->id,
            'acknowledged_at' => now(),
        ]);
    }

    /**
     * Resolve the alert.
     */
    public function resolve(): void
    {
        $this->update([
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);
    }

    /**
     * Check if alert is critical.
     */
    public function isCritical(): bool
    {
        return $this->severity === 'critical';
    }

    /**
     * Check if alert is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
