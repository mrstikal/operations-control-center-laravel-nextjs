<?php

namespace App\Console\Commands;

use App\Models\Contract;
use App\Models\Incident;
use App\Models\User;
use Illuminate\Console\Command;

class DebugData extends Command
{
    protected $signature = 'debug:data';

    protected $description = 'Debug user and data counts';

    public function handle()
    {
        $user = User::where('email', 'admin@test.local')->first();

        if (! $user) {
            $this->error('✗ User not found!');

            return 1;
        }

        $this->info('✓ User Found: '.$user->name);
        $this->line('  Email: '.$user->email);
        $this->line('  Tenant ID: '.$user->tenant_id);
        $this->line('  Status: '.$user->status);
        $this->line('');

        $tenantId = $user->tenant_id;

        $contracts = Contract::where('tenant_id', $tenantId)->count();
        $incidents = Incident::where('tenant_id', $tenantId)->count();

        $this->info('Database Data:');
        $this->line('  Contracts: '.$contracts);
        $this->line('  Incidents: '.$incidents);

        return 0;
    }
}
