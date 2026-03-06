<?php

namespace Database\Seeders;

use App\Services\EventStore\EventReadModelService;
use Illuminate\Database\Seeder;

class EventProjectionsSeeder extends Seeder
{
    public function run(): void
    {
        app(EventReadModelService::class)->rebuildProjections();
    }
}
