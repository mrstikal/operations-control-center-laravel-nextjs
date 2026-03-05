<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class DebugAuth extends Command
{
    protected $signature = 'debug:auth';
    protected $description = 'Debug authentication';

    public function handle()
    {
        $user = User::where('email', 'admin@test.local')->first();

        if (!$user) {
            $this->error('✗ User not found!');
            return 1;
        }

        $this->info('✓ User Found:');
        $this->line('  Email: ' . $user->email);
        $this->line('  Name: ' . $user->name);
        $this->line('  Tenant ID: ' . $user->tenant_id);
        $this->line('  Password Hash: ' . substr($user->password, 0, 20) . '...');
        $this->line('');

        // Test password
        $testPassword = 'password';
        $passwordMatch = Hash::check($testPassword, $user->password);

        $this->info('Password Test:');
        $this->line('  Testing password: "' . $testPassword . '"');
        $this->line('  Match: ' . ($passwordMatch ? 'YES ✓' : 'NO ✗'));
        $this->line('');

        // Test token generation
        $token = $user->createToken('test-token')->plainTextToken;
        $this->info('✓ Token Generated:');
        $this->line('  ' . substr($token, 0, 30) . '...');

        return 0;
    }
}

