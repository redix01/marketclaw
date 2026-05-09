<?php

use App\Domain\Accounts\Actions\DepositFunds;
use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Models\User;
use App\Services\MarketDataRefreshService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('market:sync-live-quotes {--stale-minutes=5}', function (): int {
    $staleMinutes = max(1, (int) $this->option('stale-minutes'));
    $updated = app(MarketDataRefreshService::class)->refreshStaleQuotes($staleMinutes);

    $this->info(sprintf('Synced %d live quote(s) from market providers.', $updated));

    return 0;
})->purpose('Sync stale live quotes from market providers');

Schedule::command('market:sync-live-quotes --stale-minutes=1')
    ->everyMinute()
    ->withoutOverlapping();

Artisan::command('wallet:credit {email?} {--amount=1000} {--description=Test credit}', function (
    EnsurePaperAccount $ensurePaperAccount,
    DepositFunds $depositFunds,
): int {
    $email = $this->argument('email');
    $amount = (float) $this->option('amount');
    $description = (string) $this->option('description');

    $query = User::query();
    if ($email) {
        $query->where('email', $email);
    }
    $users = $query->get();

    if ($users->isEmpty()) {
        $this->error($email ? "No user with email {$email}." : 'No users found.');

        return 1;
    }

    foreach ($users as $user) {
        $account = $ensurePaperAccount->handle($user);
        $depositFunds->handle($account, $amount, $description);
        $this->info(sprintf('Credited $%s to %s — new balance: $%s',
            number_format($amount, 2),
            $user->email,
            number_format((float) $account->fresh()->cash_balance, 2)
        ));
    }

    return 0;
})->purpose('Credit test funds to a user (or all users) paper wallet');
