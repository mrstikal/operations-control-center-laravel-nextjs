<?php

namespace Tests\Unit\Models;

use App\Models\Shift;
use Tests\TestCase;

class ShiftTest extends TestCase
{
    public function test_operates_on_day_and_scope_active(): void
    {
        $active = Shift::create([
            'name' => 'Weekday Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'description' => 'Weekday ops',
            'is_active' => true,
        ]);

        Shift::create([
            'name' => 'Inactive Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [6, 7],
            'description' => 'Weekend inactive',
            'is_active' => false,
        ]);

        $this->assertTrue($active->operatesOnDay(1));
        $this->assertFalse($active->operatesOnDay(7));

        $this->assertCount(1, Shift::active()->get());
    }

    public function test_get_duration_hours_returns_positive_value(): void
    {
        $shift = Shift::create([
            'name' => 'Short Shift',
            'start_time' => '08:00',
            'end_time' => '16:00',
            'days_of_week' => [1, 2, 3, 4, 5],
            'description' => 'Duration check',
            'is_active' => true,
        ]);

        $this->assertGreaterThan(0, $shift->getDurationHours());
    }
}
