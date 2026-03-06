<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetAuditTrail extends Model
{
    // Existing schema uses singular table name.
    protected $table = 'asset_audit_trail';

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

    // ========== SCOPES ==========

    /**
     * Scope to filter by action.
     */
    public function scopeByAction($query, ?string $action)
    {
        return $query->when($action, fn ($q) => $q->where('action', $action));
    }

    /**
     * Scope to filter by user.
     */
    public function scopeByUser($query, $userId)
    {
        return $query->when($userId, fn ($q) => $q->where('user_id', $userId));
    }

    /**
     * Scope to filter by action timestamp range.
     */
    public function scopeBetweenDates($query, ?string $from, ?string $to)
    {
        return $query
            ->when($from, fn ($q) => $q->where('action_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('action_at', '<=', $to));
    }
}
