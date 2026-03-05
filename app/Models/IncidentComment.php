<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class IncidentComment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'incident_id',
        'user_id',
        'comment',
        'is_internal',
        'attachments',
        'commented_at',
    ];

    protected $casts = [
        'is_internal' => 'boolean',
        'attachments' => 'json',
        'commented_at' => 'datetime',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the incident this comment belongs to.
     */
    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    /**
     * Get the user who commented.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter public comments.
     */
    public function scopePublic($query)
    {
        return $query->where('is_internal', false);
    }

    /**
     * Scope to filter internal comments.
     */
    public function scopeInternal($query)
    {
        return $query->where('is_internal', true);
    }
}

