<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class RecordApiStatusMetrics
{
    /**
     * Record API status-class counters for lightweight monitoring.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $status = $response->getStatusCode();
        $bucket = null;

        if ($status >= 400 && $status < 500) {
            $bucket = '4xx';
        } elseif ($status >= 500) {
            $bucket = '5xx';
        }

        if ($bucket !== null) {
            $hour = now()->format('YmdH');
            $key = "monitoring:api_status:{$bucket}:{$hour}";

            Cache::add($key, 0, now()->addHours(26));
            Cache::increment($key);
        }

        return $response;
    }
}
