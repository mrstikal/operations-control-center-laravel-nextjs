<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class DebugLogin extends Command
{
    protected $signature = 'debug:login';
    protected $description = 'Debug login and get token';

    public function handle()
    {
        $user = User::where('email', 'admin@test.local')->first();

        if (!$user) {
            $this->error('✗ User not found!');
            return 1;
        }

        // Create API token
        $token = $user->createToken('api-token')->plainTextToken;

        $this->info('✓ Login Token Generated:');
        $this->line('Token: ' . $token);
        $this->line('');
        $this->line('Test with:');
        $this->line('curl -H "Authorization: Bearer ' . $token . '" http://operations-control-center.test/api/contracts');

        return 0;
    }
}

