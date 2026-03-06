<?php

namespace Database\Seeders;

use App\Models\Shift;
use Illuminate\Database\Seeder;

class ShiftSeeder extends Seeder
{
    public function run(): void
    {
        $shifts = [
            [
                'name' => 'Morning Operations',
                'start_time' => '06:00',
                'end_time' => '14:00',
                'days_of_week' => [1, 2, 3, 4, 5],
                'description' => 'Primary morning shift for field and control operations.',
                'is_active' => true,
            ],
            [
                'name' => 'Day Operations',
                'start_time' => '08:00',
                'end_time' => '16:00',
                'days_of_week' => [1, 2, 3, 4, 5],
                'description' => 'Standard weekday shift for technical and management teams.',
                'is_active' => true,
            ],
            [
                'name' => 'Evening Support',
                'start_time' => '14:00',
                'end_time' => '22:00',
                'days_of_week' => [1, 2, 3, 4, 5],
                'description' => 'Extended support window for escalations and handovers.',
                'is_active' => true,
            ],
            [
                'name' => 'Weekend Response',
                'start_time' => '08:00',
                'end_time' => '20:00',
                'days_of_week' => [6, 7],
                'description' => 'Reduced staffing for weekend incidents and urgent work.',
                'is_active' => true,
            ],
        ];

        foreach ($shifts as $shiftData) {
            Shift::updateOrCreate(
                [
                    'name' => $shiftData['name'],
                ],
                [
                    'start_time' => $shiftData['start_time'],
                    'end_time' => $shiftData['end_time'],
                    'days_of_week' => $shiftData['days_of_week'],
                    'description' => $shiftData['description'],
                    'is_active' => $shiftData['is_active'],
                ]
            );
        }

        $this->command->info('ShiftSeeder: global shifts prepared.');
    }
}
