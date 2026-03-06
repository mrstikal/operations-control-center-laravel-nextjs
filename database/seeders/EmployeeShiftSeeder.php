<?php

namespace Database\Seeders;

use App\Models\EmployeeProfile;
use App\Models\EmployeeShift;
use App\Models\Shift;
use Illuminate\Database\Seeder;

class EmployeeShiftSeeder extends Seeder
{
    public function run(): void
    {
        $shifts = Shift::query()->get()->keyBy('name');
        if ($shifts->isEmpty()) {
            return;
        }

        $shiftByDepartment = [
            'Field Operations' => 'Morning Operations',
            'Technical Services' => 'Day Operations',
            'Operations Control' => 'Day Operations',
            'Asset Management' => 'Day Operations',
            'Management' => 'Day Operations',
            'Emergency Services' => 'Evening Support',
        ];

        $employees = EmployeeProfile::with('department')
            ->get();

        foreach ($employees as $employee) {
            $departmentName = data_get($employee->department, 'name', 'default');
            $shiftName = $shiftByDepartment[$departmentName] ?? 'Day Operations';
            $shift = $shifts->get($shiftName);

            if (! $shift) {
                continue;
            }

            EmployeeShift::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'shift_id' => $shift->id,
                    'start_date' => '2026-01-01',
                ],
                [
                    'end_date' => null,
                    'is_active' => true,
                ]
            );

            // Emergency services also rotate into weekend response.
            if ($departmentName === 'Emergency Services' && $shifts->has('Weekend Response')) {
                EmployeeShift::updateOrCreate(
                    [
                        'employee_id' => $employee->id,
                        'shift_id' => $shifts->get('Weekend Response')->id,
                        'start_date' => '2026-01-01',
                    ],
                    [
                        'end_date' => null,
                        'is_active' => true,
                    ]
                );
            }
        }

        $this->command->info('EmployeeShiftSeeder: employee shift assignments prepared.');
    }
}
