<?php

namespace Database\Seeders;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->updateOrCreate(
            ['email' => 'admin@marketclaw.com'],
            [
                'name' => 'MarketClaw Admin',
                'password' => Hash::make('password1234'),
                'status' => 'active',
                'is_admin' => true,
                'email_verified_at' => now(),
            ],
        );

        app(EnsurePaperAccount::class)->handle($user);
    }
}
