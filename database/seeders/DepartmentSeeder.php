<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departmentNames = [
            'Asset Management',
            'Emergency Services',
            'Field Operations',
            'Management',
            'Operations Control',
            'Technical Services',
        ];

        $inserted = 0;
        foreach ($departmentNames as $name) {
            $exists = DB::table('departments')
                ->where('name', $name)
                ->exists();

            if (! $exists) {
                DB::table('departments')->insert([
                    'name' => $name,
                    'description' => null,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $inserted++;
            }
        }

        $this->command->info("DepartmentSeeder: seeded {$inserted} new departments.");
    }
}
