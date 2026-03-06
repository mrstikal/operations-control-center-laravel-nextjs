<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Asset extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'category_id',
        'name',
        'asset_tag',
        'serial_number',
        'description',
        'location',
        'department',
        'assigned_to',
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
        'specifications' => 'array',
        'custom_fields' => 'array',
        'documents' => 'array',
    ];

    // ========== RELATIONS ==========

    /**
     * Get the tenant this asset belongs to.
     *
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        // Keep tenant context visible even when tenant is soft-deleted.
        return $this->belongsTo(Tenant::class)->withTrashed();
    }

    /**
     * Get the asset category.
     *
     * @return BelongsTo<AssetCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class);
    }

    /**
     * Get all maintenance logs for this asset.
     *
     * @return HasMany<MaintenanceLog, $this>
     */
    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(MaintenanceLog::class)
            ->orderBy('performed_at', 'desc');
    }

    /**
     * Get all maintenance schedules.
     *
     * @return HasMany<MaintenanceSchedule, $this>
     */
    public function maintenanceSchedules(): HasMany
    {
        return $this->hasMany(MaintenanceSchedule::class);
    }

    /**
     * Get all incidents for this asset.
     *
     * @return HasMany<Incident, $this>
     */
    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    /**
     * Get the audit trail.
     *
     * @return HasMany<AssetAuditTrail, $this>
     */
    public function auditTrail(): HasMany
    {
        return $this->hasMany(AssetAuditTrail::class)
            ->orderBy('action_at', 'desc');
    }

    /**
     * Get the currently assigned user.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    // ========== SCOPES ==========

    /**
     * Scope to filter by tenant.
     */
    public function scopeOfTenant($query, $tenantId)
    {
        return $query->where('assets.tenant_id', $tenantId);
    }

    /**
     * Scope to filter by status.
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter by status including deleted pseudo-status.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeFilterStatus(Builder $query, ?string $status): Builder
    {
        if ($status === 'deleted') {
            return $query->onlyTrashed();
        }

        if ($status) {
            return $query->where('status', $status);
        }

        return $query;
    }

    /**
     * Scope to filter by category.
     */
    public function scopeFilterCategory(Builder $query, mixed $categoryId): Builder
    {
        if (! $categoryId) {
            return $query;
        }

        return $query->where('category_id', $categoryId);
    }

    /**
     * Scope to filter by location.
     */
    public function scopeFilterLocation(Builder $query, ?string $location): Builder
    {
        if (! $location) {
            return $query;
        }

        return $query->where('location', $location);
    }

    /**
     * Scope to filter assets due for maintenance.
     */
    public function scopeFilterDueForMaintenance(Builder $query, mixed $dueForMaintenance): Builder
    {
        if ($dueForMaintenance === null || $dueForMaintenance === '' || $dueForMaintenance === false) {
            return $query;
        }

        return $query->where('next_maintenance', '<=', now());
    }

    /**
     * Scope to search assets.
     */
    public function scopeSearch(Builder $query, ?string $search, string $driver): Builder
    {
        if (! $search) {
            return $query;
        }

        if ($driver === 'mysql') {
            return $query->whereRaw('MATCH(name, description, serial_number) AGAINST(? IN BOOLEAN MODE)', [$search]);
        }

        $like = '%'.$search.'%';

        return $query->where(function (Builder $innerQuery) use ($like): void {
            $innerQuery->where('name', 'like', $like)
                ->orWhere('description', 'like', $like)
                ->orWhere('serial_number', 'like', $like);
        });
    }

    /**
     * Scope to apply API index sorting.
     */
    public function scopeSortForIndex(Builder $query, ?string $sortKey, string $sortDirection = 'asc'): Builder
    {
        return match ($sortKey) {
            'category' => $query->leftJoin('asset_categories as ac', 'ac.id', '=', 'assets.category_id')
                ->select('assets.*')
                ->orderBy('ac.name', $sortDirection)
                ->orderBy('assets.id', 'asc'),
            'status' => $query->orderByRaw(
                "CASE status
                    WHEN 'operational' THEN 1
                    WHEN 'maintenance' THEN 2
                    WHEN 'repair' THEN 3
                    WHEN 'retired' THEN 4
                    WHEN 'disposed' THEN 5
                    ELSE 999 END {$sortDirection}"
            ),
            default => $query->orderBy('created_at', 'desc'),
        };
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
        if (! $this->next_maintenance) {
            return null;
        }

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

    /**
     * Persist an audit record for an asset action.
     */
    public function recordAudit(
        string $action,
        int $userId,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $reason = null
    ): AssetAuditTrail {
        return $this->auditTrail()->create([
            'user_id' => $userId,
            'action' => $action,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'reason' => $reason,
            'action_at' => now(),
        ]);
    }
}
