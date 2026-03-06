<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

class ExistsInTenant implements ValidationRule
{
    public function __construct(
        private readonly string $table,
        private readonly string $column = 'id',
        private readonly ?int $tenantId = null,
        private readonly string $tenantColumn = 'tenant_id'
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (! $this->tenantId || $this->tenantId <= 0) {
            $fail('Tenant context is invalid.');

            return;
        }

        $exists = DB::table($this->table)
            ->where($this->column, $value)
            ->where($this->tenantColumn, $this->tenantId)
            ->exists();

        if (! $exists) {
            $fail('The selected :attribute is invalid for the current tenant.');
        }
    }
}
