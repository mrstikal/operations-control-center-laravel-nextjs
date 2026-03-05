<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Asset extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'category_id',
        'name',
        'asset_tag',
        'serial_number',
        'description',
        'location',
        'department',
        'manufacturer',
        'model',
        'acquisition_date',
        'warranty_expiry',
        'status',
        'utilization_percent',
        'last_maintenance',
        'next_maintenance',
        'maintenance_interval_days',
        'specifications',
        'custom_fields',
        'documents',
    ];

    protected $casts = [
        'acquisition_date' => 'date',
        'warranty_expiry' => 'date',
        'last_maintenance' => 'datetime',
        'next_maintenance' => 'datetime',
        'utilization_percent' => 'decimal:2',
        'specifications' => 'json',
        'custom_fields' => 'json',
        'documents' => 'json',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this asset belongs to.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the asset category.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class);
    }

    /**
     * Get all maintenance logs for this asset.
     */
    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(MaintenanceLog::class)
            ->orderBy('performed_at', 'desc');
    }

    /**
     * Get all maintenance schedules.
     */
    public function maintenanceSchedules(): HasMany
    {
        return $this->hasMany(MaintenanceSchedule::class);
    }

    /**
     * Get all incidents for this asset.
     */
    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    /**
     * Get the audit trail.
     */
    public function auditTrail(): HasMany
    {
        return $this->hasMany(AssetAuditTrail::class)
            ->orderBy('action_at', 'desc');
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
     * Scope to filter operational assets.
     */
    public function scopeOperational($query)
    {
        return $query->where('status', 'operational');
    }

    /**
     * Scope to filter assets due for maintenance.
     */
    public function scopeDueForMaintenance($query)
    {
        return $query->where('next_maintenance', '<=', now())
            ->where('status', 'operational');
    }

    // ========== METHODS ==========

    /**
     * Check if asset is due for maintenance.
     */
    public function isDueForMaintenance(): bool
    {
        return $this->next_maintenance && $this->next_maintenance->isPast();
    }

    /**
     * Check if warranty is expired.
     */
    public function isWarrantyExpired(): bool
    {
        return $this->warranty_expiry && $this->warranty_expiry->isPast();
    }

    /**
     * Get days until next maintenance.
     */
    public function daysUntilMaintenance(): ?int
    {
        if (!$this->next_maintenance) return null;
        return (int) now()->diffInDays($this->next_maintenance);
    }

    /**
     * Schedule next maintenance.
     */
    public function scheduleNextMaintenance(): void
    {
        if ($this->maintenance_interval_days) {
            $this->update([
                'next_maintenance' => now()->addDays($this->maintenance_interval_days),
            ]);
        }
    }

    /**
     * Log maintenance action.
     */
    public function logMaintenance($user, $type, $description, $data = []): MaintenanceLog
    {
        return $this->maintenanceLogs()->create([
            'performed_by' => $user->id,
            'type' => $type,
            'description' => $description,
            'performed_at' => now(),
            ...$data,
        ]);
    }
}

