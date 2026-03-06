<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\DashboardController;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BenchmarkDashboardPerformance extends Command
{
    protected $signature = 'perf:dashboard
        {--email=admin@test.local : User email used for auth context}
        {--runs=20 : Number of runs per endpoint}
        {--warmup=1 : Number of warmup runs per endpoint before measurement}
        {--tenant-id= : Optional tenant_id query param}
        {--all-tenants : Include all_tenants=1 query param}
        {--include-read-models : Include read-models endpoint benchmark}
        {--top-sql=10 : Number of top SQL fingerprints shown per endpoint}
        {--max-summary-p95= : Fail when summary p95 latency (ms) is above this limit}
        {--max-summary-sql-count= : Fail when summary average SQL count is above this limit}';

    protected $description = 'Benchmark dashboard endpoint methods (latency + SQL count/time) in-process';

    public function handle(): int
    {
        $runs = max(1, (int) $this->option('runs'));
        $warmupRuns = max(0, (int) $this->option('warmup'));
        $topSql = max(0, (int) $this->option('top-sql'));
        $maxSummaryP95 = $this->option('max-summary-p95');
        $maxSummarySqlCount = $this->option('max-summary-sql-count');
        $email = (string) $this->option('email');

        /** @var User|null $user */
        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $this->error("User not found for email: {$email}");

            return self::FAILURE;
        }

        $baseQuery = [];

        if ($this->option('tenant-id') !== null && $this->option('tenant-id') !== '') {
            $baseQuery['tenant_id'] = (int) $this->option('tenant-id');
        }

        if ((bool) $this->option('all-tenants')) {
            $baseQuery['all_tenants'] = 1;
        }

        $scenarios = [
            'summary' => $baseQuery,
            'feed' => array_merge($baseQuery, ['limit' => 15]),
        ];

        if ((bool) $this->option('include-read-models')) {
            $scenarios['readModels'] = array_merge($baseQuery, [
                'projections_page' => 1,
                'snapshots_page' => 1,
                'per_page' => 10,
            ]);
        }

        $this->info('Running dashboard benchmark...');
        $this->line("User: {$user->email} (id={$user->id}, tenant_id={$user->tenant_id})");
        $this->line("Runs per endpoint: {$runs}");
        $this->line("Warmup runs per endpoint: {$warmupRuns}");
        $this->newLine();

        $controller = app(DashboardController::class);

        $rows = [];
        $summaryStats = null;

        foreach ($scenarios as $method => $query) {
            $metrics = [];

            for ($i = 0; $i < $warmupRuns; $i++) {
                $this->runScenario($controller, $method, $query, $user);
            }

            for ($i = 0; $i < $runs; $i++) {
                $metrics[] = $this->runScenario($controller, $method, $query, $user);
            }

            $latencies = array_column($metrics, 'latency_ms');
            $queryCounts = array_column($metrics, 'query_count');
            $queryTimes = array_column($metrics, 'query_time_ms');
            $statuses = array_values(array_unique(array_column($metrics, 'status')));

            $rows[] = [
                $method,
                number_format($this->average($latencies), 2),
                number_format($this->percentile($latencies, 50), 2),
                number_format($this->percentile($latencies, 95), 2),
                number_format($this->average($queryCounts), 2),
                number_format($this->percentile($queryCounts, 95), 2),
                number_format($this->average($queryTimes), 2),
                implode(',', $statuses),
            ];

            if ($method === 'summary') {
                $summaryStats = [
                    'p95' => $this->percentile($latencies, 95),
                    'avg_sql_count' => $this->average($queryCounts),
                ];
            }

            if ($topSql > 0) {
                $this->newLine();
                $this->line("Top SQL fingerprints for {$method} (by total_ms):");
                $this->table(
                    ['total_ms', 'avg_ms', 'count', 'sql'],
                    $this->buildSqlFingerprintReport($metrics, $topSql)
                );
            }
        }

        $this->table(
            ['endpoint', 'lat_avg_ms', 'lat_p50_ms', 'lat_p95_ms', 'sql_avg_count', 'sql_p95_count', 'sql_avg_ms', 'status_codes'],
            $rows
        );

        $this->newLine();
        $this->comment('Tip: run before/after code changes with same --email/--tenant-id/--runs for comparable numbers.');

        $violations = [];

        if (is_array($summaryStats)) {
            if ($maxSummaryP95 !== null && $maxSummaryP95 !== '') {
                $limit = (float) $maxSummaryP95;
                if ($summaryStats['p95'] > $limit) {
                    $violations[] = sprintf(
                        'summary p95 latency %.2f ms exceeds limit %.2f ms',
                        $summaryStats['p95'],
                        $limit
                    );
                }
            }

            if ($maxSummarySqlCount !== null && $maxSummarySqlCount !== '') {
                $limit = (float) $maxSummarySqlCount;
                if ($summaryStats['avg_sql_count'] > $limit) {
                    $violations[] = sprintf(
                        'summary average SQL count %.2f exceeds limit %.2f',
                        $summaryStats['avg_sql_count'],
                        $limit
                    );
                }
            }
        }

        if ($violations !== []) {
            $this->newLine();
            foreach ($violations as $violation) {
                $this->error('PERF BUDGET VIOLATION: '.$violation);
            }

            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    /**
     * @param  array<string,mixed>  $query
     * @return array{latency_ms:float,query_count:int,query_time_ms:float,status:int,query_log:array<int,array<string,mixed>>}
     */
    private function runScenario(DashboardController $controller, string $method, array $query, User $user): array
    {
        $connection = DB::connection();

        $previousRequest = app()->bound('request') ? app('request') : null;
        $previousUser = Auth::user();

        $request = Request::create('/internal/perf/dashboard/'.$method, 'GET', $query);
        $request->headers->set('Accept', 'application/json');

        app()->instance('request', $request);
        Auth::setUser($user);

        $connection->flushQueryLog();
        $connection->enableQueryLog();

        $startedAt = microtime(true);

        try {
            $response = $controller->{$method}();
            $status = $response->getStatusCode();
        } finally {
            $latencyMs = (microtime(true) - $startedAt) * 1000;
            $queryLog = $connection->getQueryLog();
            $connection->flushQueryLog();
            $connection->disableQueryLog();

            if ($previousUser) {
                Auth::setUser($previousUser);
            }

            if ($previousRequest instanceof Request) {
                app()->instance('request', $previousRequest);
            }
        }

        $queryCount = count($queryLog);
        $queryTimeMs = (float) array_sum(array_map(
            static fn (array $entry): float => (float) ($entry['time'] ?? 0.0),
            $queryLog
        ));

        return [
            'latency_ms' => $latencyMs,
            'query_count' => $queryCount,
            'query_time_ms' => $queryTimeMs,
            'status' => $status,
            'query_log' => $queryLog,
        ];
    }

    /**
     * @param  array<int,array{query_log:array<int,array<string,mixed>>}>  $metrics
     * @return array<int,array{string,string,string,string}>
     */
    private function buildSqlFingerprintReport(array $metrics, int $limit): array
    {
        $buckets = [];

        foreach ($metrics as $metric) {
            foreach ($metric['query_log'] as $entry) {
                $sql = $this->normalizeSql((string) ($entry['query'] ?? ''));
                if ($sql === '') {
                    continue;
                }

                if (! isset($buckets[$sql])) {
                    $buckets[$sql] = [
                        'count' => 0,
                        'total_ms' => 0.0,
                    ];
                }

                $buckets[$sql]['count']++;
                $buckets[$sql]['total_ms'] += (float) ($entry['time'] ?? 0.0);
            }
        }

        uasort($buckets, static function (array $a, array $b): int {
            return $b['total_ms'] <=> $a['total_ms'];
        });

        $rows = [];
        $slice = array_slice($buckets, 0, $limit, true);

        foreach ($slice as $sql => $stats) {
            $count = max(1, (int) $stats['count']);
            $rows[] = [
                number_format((float) $stats['total_ms'], 2),
                number_format(((float) $stats['total_ms']) / $count, 2),
                (string) $count,
                $this->truncateSql($sql),
            ];
        }

        if ($rows === []) {
            $rows[] = ['0.00', '0.00', '0', '(no SQL captured)'];
        }

        return $rows;
    }

    private function normalizeSql(string $sql): string
    {
        $sql = trim($sql);
        if ($sql === '') {
            return '';
        }

        return (string) preg_replace('/\s+/', ' ', $sql);
    }

    private function truncateSql(string $sql, int $max = 120): string
    {
        if (strlen($sql) <= $max) {
            return $sql;
        }

        return substr($sql, 0, $max - 3).'...';
    }

    /**
     * @param  array<int,float|int>  $values
     */
    private function average(array $values): float
    {
        if ($values === []) {
            return 0.0;
        }

        return array_sum($values) / count($values);
    }

    /**
     * @param  array<int,float|int>  $values
     */
    private function percentile(array $values, float $percentile): float
    {
        if ($values === []) {
            return 0.0;
        }

        sort($values, SORT_NUMERIC);

        $index = (int) ceil(($percentile / 100) * count($values)) - 1;
        $index = max(0, min($index, count($values) - 1));

        return (float) $values[$index];
    }
}
