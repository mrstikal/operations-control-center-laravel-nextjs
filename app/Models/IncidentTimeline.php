<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentTimeline extends Model
{
    // Migration creates singular table name.
    protected $table = 'incident_timeline';

    public $timestamps = true;

    protected $fillable = [
        'incident_id',
        'user_id',
        'event_type',
        'message',
        'metadata',
        'occurred_at',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
        'metadata' => 'json',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the incident this timeline belongs to.
     */
    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    /**
     * Get the user who triggered this event.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
