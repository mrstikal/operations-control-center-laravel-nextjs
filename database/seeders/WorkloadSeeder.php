<?php

namespace Database\Seeders;

use App\Models\EmployeeProfile;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class WorkloadSeeder extends Seeder
{
    public function run(): void
    {
        $table = $this->resolveWorkloadTable();
        if (! $table) {
            return;
        }

        $employees = EmployeeProfile::query()->with('department')->get();
        if ($employees->isEmpty()) {
            return;
        }

        $workDates = $this->lastBusinessDays(10);

        $loadByDepartment = [
            'Field Operations' => [0.92, 0.96, 1.00, 0.90, 0.88, 0.94, 0.98, 1.02, 0.91, 0.87],
            'Technical Services' => [0.86, 0.89, 0.93, 0.90, 0.85, 0.88, 0.92, 0.95, 0.89, 0.84],
            'Emergency Services' => [1.04, 1.08, 0.98, 1.12, 0.94, 1.02, 1.06, 1.01, 1.09, 0.97],
            'Management' => [0.72, 0.78, 0.80, 0.75, 0.70, 0.74, 0.79, 0.82, 0.76, 0.71],
            'Operations Control' => [0.82, 0.86, 0.90, 0.88, 0.81, 0.83, 0.87, 0.91, 0.86, 0.80],
            'Asset Management' => [0.84, 0.88, 0.92, 0.87, 0.83, 0.85, 0.89, 0.93, 0.88, 0.82],
            'default' => [0.80, 0.84, 0.88, 0.85, 0.80, 0.81, 0.85, 0.89, 0.84, 0.79],
        ];

        $tasksByDepartment = [
            'Field Operations' => [
                'Preventive maintenance routes',
                'On-site equipment diagnostics',
                'Replacement component install',
                'Post-maintenance verification',
                'Field safety checklist review',
            ],
            'Technical Services' => [
                'Infrastructure health checks',
                'Change request implementation',
                'Monitoring alert triage',
                'Root-cause troubleshooting',
                'Platform patch validation',
            ],
            'Emergency Services' => [
                'Incident bridge coordination',
                'Escalation command handling',
                'SLA breach mitigation',
                'After-action review drafting',
                'Critical response readiness check',
            ],
            'Management' => [
                'Capacity planning review',
                'Weekly service governance',
                'Vendor performance sync',
                'Risk register updates',
                'Executive stakeholder reporting',
            ],
            'Operations Control' => [
                'Dispatch queue balancing',
                'SLA dashboard validation',
                'Ticket prioritization workshop',
                'Client status communications',
                'Operational handover review',
            ],
            'Asset Management' => [
                'Asset lifecycle checks',
                'Warranty and contract alignment',
                'Inventory discrepancy resolution',
                'Maintenance backlog planning',
                'Disposal and refresh validation',
            ],
            'default' => [
                'Operations planning',
                'Service delivery follow-up',
                'Issue tracking updates',
                'Team coordination tasks',
                'Quality review activities',
            ],
        ];

        foreach ($employees as $employee) {
            $department = data_get($employee->department, 'name', 'default');
            $pattern = $loadByDepartment[$department] ?? $loadByDepartment['default'];
            $taskPool = $tasksByDepartment[$department] ?? $tasksByDepartment['default'];

            $weeklyHours = max(20, (int) ($employee->available_hours_per_week ?? 40));
            $dailyCapacity = round($weeklyHours / 5, 2);

            foreach ($workDates as $index => $workDate) {
                $loadFactor = $pattern[$index];
                $hoursAllocated = round($dailyCapacity * $loadFactor, 2);

                // Keep realistic but deterministic actuals: slightly under on Mon/Fri, slightly over Tue/Thu.
                $weekday = (int) $workDate->dayOfWeekIso;
                $actualAdjustment = match ($weekday) {
                    1, 5 => -0.2,
                    2, 4 => 0.3,
                    default => 0.1,
                };
                $hoursActual = max(0, round($hoursAllocated + $actualAdjustment, 2));

                $tasks = [
                    $taskPool[$index % count($taskPool)],
                    $taskPool[($index + 2) % count($taskPool)],
                ];

                DB::table($table)->updateOrInsert(
                    [
                        'employee_id' => $employee->id,
                        'work_date' => $workDate->toDateString(),
                    ],
                    [
                        'hours_allocated' => $hoursAllocated,
                        'hours_actual' => $hoursActual,
                        'capacity_utilization' => round(($hoursAllocated / $dailyCapacity) * 100, 2),
                        'tasks' => json_encode([
                            'focus' => $tasks[0],
                            'secondary' => $tasks[1],
                            'notes' => 'Seeded baseline workload plan',
                        ]),
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }
        }
    }

    /**
     * @return list<Carbon>
     */
    private function lastBusinessDays(int $count): array
    {
        $dates = [];
        $cursor = now()->copy();

        while (count($dates) < $count) {
            if ($cursor->isWeekday()) {
                $dates[] = $cursor->copy()->startOfDay();
            }
            $cursor->subDay();
        }

        return array_reverse($dates);
    }

    private function resolveWorkloadTable(): ?string
    {
        if (Schema::hasTable('workloads')) {
            return 'workloads';
        }

        if (Schema::hasTable('workload')) {
            return 'workload';
        }

        return null;
    }
}
