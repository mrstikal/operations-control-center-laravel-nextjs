<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SearchQuery extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'query',
        'results_count',
        'execution_time_ms',
        'searched_at',
    ];

    protected $casts = [
        'execution_time_ms' => 'decimal:2',
        'searched_at' => 'datetime',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this query belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who performed search.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter by user.
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to filter recent searches.
     */
    public function scopeRecent($query, $days = 7)
    {
        return $query->where('searched_at', '>=', now()->subDays($days));
    }
}
