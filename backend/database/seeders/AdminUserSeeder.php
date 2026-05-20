<?php

namespace Database\Seeders;

use App\Domain\Accounts\Actions\DepositFunds;
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

        // Admins get a 100k starting paper wallet so they always have headroom
        // to test bot flows / large trades. On a brand-new admin EnsurePaperAccount
        // creates the account at $100,000 with the opening-deposit ledger entry.
        // For an existing admin that's sitting below 100k (e.g. from before
        // this seeder change) we top up the difference as a tracked deposit
        // so the ledger stays consistent.
        $hadAccount = $user->paperAccount()->exists();
        $account = app(EnsurePaperAccount::class)->handle($user, $hadAccount ? 0.0 : 100000.0);
        if ($hadAccount && (float) $account->cash_balance < 100000.0) {
            $delta = 100000.0 - (float) $account->cash_balance;
            app(DepositFunds::class)->handle(
                $account,
                $delta,
                'Admin seed top-up to $100,000',
                'system',
                ['reason' => 'admin_seed_top_up'],
            );
        }
    }
}
