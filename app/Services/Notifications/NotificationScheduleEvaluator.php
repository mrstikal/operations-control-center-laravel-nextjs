<?php

namespace App\Services\Notifications;

use App\Models\NotificationSchedule;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Evaluates notification schedule conditions against a runtime context
 * and resolves the final list of recipient user IDs.
 */
class NotificationScheduleEvaluator
{
    /**
     * Check whether the given schedule's conditions match the provided context.
     *
     * @param  array<string, mixed>  $context  Runtime data (e.g. ['severity' => 'critical', 'sla_breached' => true])
     */
    public function matches(NotificationSchedule $schedule, array $context): bool
    {
        $conditions = $schedule->conditions;

        // No conditions means "always match"
        if (empty($conditions) || empty($conditions['rules'])) {
            return true;
        }

        foreach ($conditions['rules'] as $rule) {
            if (! $this->evaluateRule($rule, $context)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Resolve the list of User IDs that should receive a notification
     * based on the schedule's recipients configuration.
     *
     * @return array<int>
     */
    public function resolveRecipientIds(NotificationSchedule $schedule): array
    {
        $recipients = $schedule->recipients ?? [];
        $tenantId = $schedule->tenant_id;

        $userIds = collect($recipients['user_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->values();

        $rolesUserIds = collect($recipients['roles'] ?? [])
            ->flatMap(fn (string $role) => $this->getUserIdsByRole($role, $tenantId));

        return $userIds->merge($rolesUserIds)->unique()->values()->all();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Evaluate a single rule against the given context.
     *
     * @param  array{field: string, operator: string, value: mixed}  $rule
     * @param  array<string, mixed>  $context
     */
    private function evaluateRule(array $rule, array $context): bool
    {
        $field = $rule['field'];
        $operator = $rule['operator'];
        $expected = $rule['value'];

        if ($field === '' || $operator === '') {
            return true;
        }

        $actual = $context[$field] ?? null;

        return match ($operator) {
            'eq' => $actual == $expected,
            'neq' => $actual != $expected,
            'gt' => is_numeric($actual) && $actual > $expected,
            'gte' => is_numeric($actual) && $actual >= $expected,
            'lt' => is_numeric($actual) && $actual < $expected,
            'lte' => is_numeric($actual) && $actual <= $expected,
            'in' => is_array($expected) && in_array($actual, $expected, strict: false),
            'contains' => is_string($actual) && str_contains((string) $actual, (string) $expected),
            'exists' => $actual !== null,
            default => true,
        };
    }

    /**
     * Fetch user IDs belonging to a given role within a tenant.
     *
     * @return Collection<int, int>
     */
    private function getUserIdsByRole(string $roleName, int $tenantId): Collection
    {
        return User::where('tenant_id', $tenantId)
            ->whereHas('roles', fn ($q) => $q->where('name', $roleName))
            ->pluck('id')
            ->map(fn ($id) => (int) $id);
    }
}
