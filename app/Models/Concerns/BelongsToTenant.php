<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder): void {
            $user = Auth::user();

            if (! $user instanceof User) {
                return;
            }

            if (self::canBypassTenantScope($user)) {
                return;
            }

            $builder->where(
                $builder->getModel()->qualifyColumn('tenant_id'),
                $user->tenant_id
            );
        });

        static::creating(function (Model $model): void {
            $user = Auth::user();

            if (! $user instanceof User) {
                return;
            }

            if (self::canBypassTenantScope($user)) {
                return;
            }

            if ($model->getAttribute('tenant_id') !== null) {
                return;
            }

            $model->setAttribute('tenant_id', $user->tenant_id);
        });
    }

    public function scopeWithoutTenantScope(Builder $query): Builder
    {
        return $query->withoutGlobalScope('tenant');
    }

    private static function canBypassTenantScope(User $user): bool
    {
        // Scope cache to the current request to avoid leaking decisions across
        // multiple requests/tests that may reuse the same numeric user ID.
        static $cache = [];

        $request = request();
        $requestKey = spl_object_id($request);
        $cacheKey = $requestKey.':'.$user->id;

        if (array_key_exists($cacheKey, $cache)) {
            return $cache[$cacheKey];
        }

        $legacyRole = $user->getAttribute('role');
        if (is_string($legacyRole) && strcasecmp(trim($legacyRole), 'superadmin') === 0) {
            return $cache[$cacheKey] = true;
        }

        if ($user->relationLoaded('roles')) {
            $hasPrivilegedRoleInLoadedRelation = $user->roles
                ->pluck('name')
                ->intersect(['Admin', 'Superadmin'])
                ->isNotEmpty();

            if ($hasPrivilegedRoleInLoadedRelation) {
                return $cache[$cacheKey] = true;
            }
            // Do not return false here; loaded relations can be empty due to tenant-scoped eager loading.
            // Fall through to pivot-table lookup, which is scope-independent.
        }

        return $cache[$cacheKey] = DB::table('user_roles')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->where('user_roles.user_id', $user->id)
            ->whereIn('roles.name', ['Admin', 'Superadmin'])
            ->exists();
    }
}
