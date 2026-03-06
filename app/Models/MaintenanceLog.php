<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceLog extends Model
{
    public $timestamps = true;

    protected $fillable = [
        'asset_id',
        'performed_by',
        'type',
        'description',
        'hours_spent',
        'cost',
        'performed_at',
        'notes',
        'parts_replaced',
    ];

    protected $casts = [
        'performed_at' => 'datetime',
        'hours_spent' => 'decimal:2',
        'cost' => 'decimal:2',
        'parts_replaced' => 'json',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the asset this log belongs to.
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /**
     * Get the user who performed maintenance.
     */
    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter by type.
     */
    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }
}
