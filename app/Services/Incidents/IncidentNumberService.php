<?php

namespace App\Services\Incidents;

use Illuminate\Database\QueryException;

class IncidentNumberService
{
    public function nextIncidentNumber(?string $lastIncidentNumber): string
    {
        $lastValue = 0;

        if ($lastIncidentNumber && preg_match('/^INC-(\d+)$/', $lastIncidentNumber, $matches) === 1) {
            $lastValue = (int) $matches[1];
        }

        $nextValue = $lastValue + 1;

        return 'INC-'.str_pad((string) $nextValue, 6, '0', STR_PAD_LEFT);
    }

    public function isIncidentNumberCollision(QueryException $exception): bool
    {
        $message = $exception->getMessage();

        return str_contains($message, 'incident_number')
            && (
                str_contains($message, 'UNIQUE constraint failed')
                || str_contains($message, 'Duplicate entry')
                || str_contains($message, 'unique')
            );
    }
}
