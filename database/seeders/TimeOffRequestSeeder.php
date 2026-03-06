<?php

namespace Database\Seeders;

use App\Models\EmployeeProfile;
use App\Models\Tenant;
use App\Models\TimeOffRequest;
use App\Models\User;
use Illuminate\Database\Seeder;

class TimeOffRequestSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('status', 'active')->first();
        if (! $tenant) {
            return;
        }

        $admin = User::where('tenant_id', $tenant->id)->where('email', 'admin@test.local')->first();
        $manager = User::where('tenant_id', $tenant->id)->where('email', 'manager@test.local')->first();
        if (! $admin || ! $manager) {
            return;
        }

        $requests = [
            [
                'employee_email' => 'john.martinez@occ.local',
                'type' => 'vacation',
                'status' => 'approved',
                'start_date' => '2026-02-10 08:00:00',
                'end_date' => '2026-02-14 17:00:00',
                'requested_by_email' => 'john.martinez@occ.local',
                'approved_by_email' => 'manager@test.local',
                'reason' => 'Family vacation leave.',
                'approval_note' => 'Approved with coverage confirmed.',
                'requested_at' => '2026-01-20 09:15:00',
                'decided_at' => '2026-01-22 11:00:00',
            ],
            [
                'employee_email' => 'sarah.johnson@occ.local',
                'type' => 'personal',
                'status' => 'approved',
                'start_date' => '2026-02-25 08:00:00',
                'end_date' => '2026-02-26 17:00:00',
                'requested_by_email' => 'sarah.johnson@occ.local',
                'approved_by_email' => 'manager@test.local',
                'reason' => 'Personal appointments.',
                'approval_note' => 'Approved for two business days.',
                'requested_at' => '2026-02-05 10:30:00',
                'decided_at' => '2026-02-06 14:20:00',
            ],
            [
                'employee_email' => 'michael.chen@occ.local',
                'type' => 'other',
                'status' => 'rejected',
                'start_date' => '2026-03-12 08:00:00',
                'end_date' => '2026-03-15 17:00:00',
                'requested_by_email' => 'michael.chen@occ.local',
                'approved_by_email' => 'admin@test.local',
                'reason' => 'Training conference attendance.',
                'approval_note' => 'Rejected due to critical response period.',
                'requested_at' => '2026-03-01 08:45:00',
                'decided_at' => '2026-03-02 12:00:00',
            ],
            [
                'employee_email' => 'emily.rodriguez@occ.local',
                'type' => 'sick_leave',
                'status' => 'approved',
                'start_date' => '2026-01-28 08:00:00',
                'end_date' => '2026-01-30 17:00:00',
                'requested_by_email' => 'emily.rodriguez@occ.local',
                'approved_by_email' => 'manager@test.local',
                'reason' => 'Medical leave.',
                'approval_note' => 'Get well soon.',
                'requested_at' => '2026-01-28 06:50:00',
                'decided_at' => '2026-01-28 09:00:00',
            ],
            [
                'employee_email' => 'priya.nair@occ.local',
                'type' => 'vacation',
                'status' => 'pending',
                'start_date' => '2026-03-18 08:00:00',
                'end_date' => '2026-03-21 17:00:00',
                'requested_by_email' => 'priya.nair@occ.local',
                'approved_by_email' => null,
                'reason' => 'Planned vacation trip.',
                'approval_note' => null,
                'requested_at' => '2026-03-07 15:25:00',
                'decided_at' => null,
            ],
            [
                'employee_email' => 'ahmed.elsayed@occ.local',
                'type' => 'personal',
                'status' => 'cancelled',
                'start_date' => '2026-03-05 08:00:00',
                'end_date' => '2026-03-06 17:00:00',
                'requested_by_email' => 'ahmed.elsayed@occ.local',
                'approved_by_email' => null,
                'reason' => 'Family commitment.',
                'approval_note' => null,
                'requested_at' => '2026-02-24 09:10:00',
                'decided_at' => '2026-03-01 10:05:00',
            ],
            [
                'employee_email' => 'martina.horakova@occ.local',
                'type' => 'vacation',
                'status' => 'pending',
                'start_date' => '2026-03-25 08:00:00',
                'end_date' => '2026-03-28 17:00:00',
                'requested_by_email' => 'martina.horakova@occ.local',
                'approved_by_email' => null,
                'reason' => 'Spring leave block.',
                'approval_note' => null,
                'requested_at' => '2026-03-08 11:40:00',
                'decided_at' => null,
            ],
            [
                'employee_email' => 'lucas.novak@occ.local',
                'type' => 'vacation',
                'status' => 'approved',
                'start_date' => '2026-01-13 08:00:00',
                'end_date' => '2026-01-17 17:00:00',
                'requested_by_email' => 'lucas.novak@occ.local',
                'approved_by_email' => 'manager@test.local',
                'reason' => 'Winter holiday with family.',
                'approval_note' => 'Approved, shift coverage aligned.',
                'requested_at' => '2025-12-20 09:00:00',
                'decided_at' => '2025-12-22 13:30:00',
            ],
            [
                'employee_email' => 'anna.svobodova@occ.local',
                'type' => 'personal',
                'status' => 'approved',
                'start_date' => '2026-02-03 08:00:00',
                'end_date' => '2026-02-03 17:00:00',
                'requested_by_email' => 'anna.svobodova@occ.local',
                'approved_by_email' => 'admin@test.local',
                'reason' => 'Official appointment.',
                'approval_note' => 'Approved for one day.',
                'requested_at' => '2026-01-28 11:15:00',
                'decided_at' => '2026-01-29 10:05:00',
            ],
            [
                'employee_email' => 'marek.dvorak@occ.local',
                'type' => 'other',
                'status' => 'rejected',
                'start_date' => '2026-02-20 08:00:00',
                'end_date' => '2026-02-24 17:00:00',
                'requested_by_email' => 'marek.dvorak@occ.local',
                'approved_by_email' => 'admin@test.local',
                'reason' => 'Long conference attendance.',
                'approval_note' => 'Rejected due to end-of-month reporting window.',
                'requested_at' => '2026-02-01 08:40:00',
                'decided_at' => '2026-02-02 14:45:00',
            ],
            [
                'employee_email' => 'petra.kralova@occ.local',
                'type' => 'vacation',
                'status' => 'approved',
                'start_date' => '2026-02-17 08:00:00',
                'end_date' => '2026-02-19 17:00:00',
                'requested_by_email' => 'petra.kralova@occ.local',
                'approved_by_email' => 'manager@test.local',
                'reason' => 'Short vacation leave.',
                'approval_note' => 'Approved.',
                'requested_at' => '2026-01-31 09:50:00',
                'decided_at' => '2026-02-01 16:30:00',
            ],
            [
                'employee_email' => 'tomas.havel@occ.local',
                'type' => 'personal',
                'status' => 'cancelled',
                'start_date' => '2026-02-11 08:00:00',
                'end_date' => '2026-02-12 17:00:00',
                'requested_by_email' => 'tomas.havel@occ.local',
                'approved_by_email' => null,
                'reason' => 'Family obligations.',
                'approval_note' => null,
                'requested_at' => '2026-02-01 10:10:00',
                'decided_at' => '2026-02-05 09:00:00',
            ],
            [
                'employee_email' => 'linda.park@occ.local',
                'type' => 'sick_leave',
                'status' => 'approved',
                'start_date' => '2026-02-06 08:00:00',
                'end_date' => '2026-02-07 17:00:00',
                'requested_by_email' => 'linda.park@occ.local',
                'approved_by_email' => 'manager@test.local',
                'reason' => 'Flu symptoms.',
                'approval_note' => 'Approved and logged as medical leave.',
                'requested_at' => '2026-02-06 06:20:00',
                'decided_at' => '2026-02-06 08:30:00',
            ],
            [
                'employee_email' => 'natalia.gomez@occ.local',
                'type' => 'vacation',
                'status' => 'pending',
                'start_date' => '2026-04-07 08:00:00',
                'end_date' => '2026-04-10 17:00:00',
                'requested_by_email' => 'natalia.gomez@occ.local',
                'approved_by_email' => null,
                'reason' => 'Planned spring break.',
                'approval_note' => null,
                'requested_at' => '2026-03-08 09:35:00',
                'decided_at' => null,
            ],
            [
                'employee_email' => 'erik.lund@occ.local',
                'type' => 'other',
                'status' => 'approved',
                'start_date' => '2026-01-22 08:00:00',
                'end_date' => '2026-01-23 17:00:00',
                'requested_by_email' => 'erik.lund@occ.local',
                'approved_by_email' => 'admin@test.local',
                'reason' => 'Incident command certification renewal.',
                'approval_note' => 'Approved as strategic training.',
                'requested_at' => '2026-01-10 13:15:00',
                'decided_at' => '2026-01-11 15:10:00',
            ],
            [
                'employee_email' => 'sophie.martin@occ.local',
                'type' => 'personal',
                'status' => 'approved',
                'start_date' => '2026-03-04 08:00:00',
                'end_date' => '2026-03-04 17:00:00',
                'requested_by_email' => 'sophie.martin@occ.local',
                'approved_by_email' => 'admin@test.local',
                'reason' => 'Client board meeting travel day.',
                'approval_note' => 'Approved for one day.',
                'requested_at' => '2026-02-24 16:20:00',
                'decided_at' => '2026-02-25 09:00:00',
            ],
            [
                'employee_email' => 'daniel.kim@occ.local',
                'type' => 'vacation',
                'status' => 'pending',
                'start_date' => '2026-04-14 08:00:00',
                'end_date' => '2026-04-18 17:00:00',
                'requested_by_email' => 'daniel.kim@occ.local',
                'approved_by_email' => null,
                'reason' => 'Annual leave block.',
                'approval_note' => null,
                'requested_at' => '2026-03-09 08:10:00',
                'decided_at' => null,
            ],
            [
                'employee_email' => 'veronika.blaha@occ.local',
                'type' => 'personal',
                'status' => 'approved',
                'start_date' => '2026-02-27 08:00:00',
                'end_date' => '2026-02-27 17:00:00',
                'requested_by_email' => 'veronika.blaha@occ.local',
                'approved_by_email' => 'manager@test.local',
                'reason' => 'Family administrative matters.',
                'approval_note' => 'Approved.',
                'requested_at' => '2026-02-20 11:00:00',
                'decided_at' => '2026-02-21 09:20:00',
            ],
            [
                'employee_email' => 'jakub.prochazka@occ.local',
                'type' => 'sick_leave',
                'status' => 'approved',
                'start_date' => '2026-03-02 08:00:00',
                'end_date' => '2026-03-03 17:00:00',
                'requested_by_email' => 'jakub.prochazka@occ.local',
                'approved_by_email' => 'manager@test.local',
                'reason' => 'Short-term illness.',
                'approval_note' => 'Approved as medical leave.',
                'requested_at' => '2026-03-02 06:45:00',
                'decided_at' => '2026-03-02 08:00:00',
            ],
        ];

        foreach ($requests as $item) {
            $employeeUser = User::where('tenant_id', $tenant->id)->where('email', $item['employee_email'])->first();
            $requester = User::where('tenant_id', $tenant->id)->where('email', $item['requested_by_email'])->first();
            $approver = $item['approved_by_email']
                ? User::where('tenant_id', $tenant->id)->where('email', $item['approved_by_email'])->first()
                : null;

            if (! $employeeUser || ! $requester) {
                continue;
            }

            $employeeProfile = EmployeeProfile::where('user_id', $employeeUser->id)
                ->first();

            if (! $employeeProfile) {
                continue;
            }

            TimeOffRequest::updateOrCreate(
                [
                    'employee_id' => $employeeProfile->id,
                    'start_date' => $item['start_date'],
                    'end_date' => $item['end_date'],
                    'type' => $item['type'],
                ],
                [
                    'status' => $item['status'],
                    'requested_by' => $requester->id,
                    'approved_by' => $approver?->id,
                    'reason' => $item['reason'],
                    'approval_note' => $item['approval_note'],
                    'requested_at' => $item['requested_at'],
                    'decided_at' => $item['decided_at'],
                ]
            );
        }

        $this->command->info('TimeOffRequestSeeder: time-off request history prepared.');
    }
}
