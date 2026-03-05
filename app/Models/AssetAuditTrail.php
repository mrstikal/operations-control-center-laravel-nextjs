<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetAuditTrail extends Model
{
    public $timestamps = true;

    protected $fillable = [
        'asset_id',
        'user_id',
        'action',
        'old_values',
        'new_values',
        'reason',
        'action_at',
    ];

    protected $casts = [
        'action_at' => 'datetime',
        'old_values' => 'json',
        'new_values' => 'json',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the asset this audit record belongs to.
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Get the user who made the change.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

