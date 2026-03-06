<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SearchIndex extends Model
{
    protected $table = 'search_index';

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'indexable_type',
        'indexable_id',
        'searchable_text',
        'metadata',
        'indexed_at',
        'updated_at',
    ];

    protected $casts = [
        'metadata' => 'json',
        'indexed_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this index belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter by indexable type.
     */
    public function scopeForType($query, $indexableType)
    {
        return $query->where('indexable_type', $indexableType);
    }

    /**
     * Scope for fulltext search.
     */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $normalizedTerm = trim((string) $term);
        if ($normalizedTerm === '') {
            return $query;
        }

        $driver = $query->getModel()->getConnection()->getDriverName();
        if ($driver === 'mysql') {
            return $query->whereRaw('MATCH(searchable_text) AGAINST(? IN BOOLEAN MODE)', [$normalizedTerm]);
        }

        return $query->where('searchable_text', 'like', '%'.$normalizedTerm.'%');
    }

    /**
     * Scope to filter by tenant.
     */
    public function scopeOfTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }
}
