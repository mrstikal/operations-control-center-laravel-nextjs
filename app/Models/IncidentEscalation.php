<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentEscalation extends Model
{
    public $timestamps = true;

    protected $fillable = [
        'incident_id',
        'escalated_by',
        'escalated_to',
        'escalation_level',
        'reason',
        'notes',
        'escalated_at',
        'resolved_at',
    ];

    protected $casts = [
        'escalated_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the incident this escalation belongs to.
     */
    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    /**
     * Get the user who escalated.
     */
    public function escalatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'escalated_by');
    }

    /**
     * Get the user it was escalated to.
     */
    public function escalatedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'escalated_to');
    }

    // ========== METHODS ==========

    /**
     * Resolve the escalation.
     */
    public function resolve(): void
    {
        $this->update(['resolved_at' => now()]);
    }

    /**
     * Check if escalation is active.
     */
    public function isActive(): bool
    {
        return is_null($this->resolved_at);
    }
}
