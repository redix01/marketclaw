<?php

use App\Domain\Accounts\Actions\DepositFunds;
use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Trading\Actions\AutoCloseProfitablePositions;
use App\Domain\Trading\Actions\SeedBotPositions;
use App\Models\User;
use App\Models\UserPreference;
use App\Services\MarketDataRefreshService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
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

/**
 * Trading automation tick.
 *
 * Runs on a cron interval (see schedule below) and walks every user whose
 * bot is flipped on. For each one we:
 *   1. Auto-close any open positions that have hit the user's take-profit
 *      or stop-loss thresholds (commissions handled by AutoClose action).
 *   2. Top the slot count back up to max_open_positions by opening fresh
 *      grids on the most volatile symbols in their selected asset class.
 *
 * This is what makes the AI Trader keep working when the user's browser
 * is closed — the in-browser tick loop only animates while the dashboard
 * is open; this cron is the source of truth.
 */
Artisan::command('trader:tick {--user=}', function (
    AutoCloseProfitablePositions $autoClose,
    SeedBotPositions $seed,
    MarketDataRefreshService $marketData,
): int {
    // Make sure we're acting on fresh prices before checking thresholds.
    $marketData->refreshStaleQuotes(2);

    $query = UserPreference::query()->where('bot_running', true);
    if ($userFilter = $this->option('user')) {
        $userId = User::query()->where('email', $userFilter)->orWhere('id', $userFilter)->value('id');
        if (! $userId) {
            $this->error("No user matches {$userFilter}.");

            return 1;
        }
        $query->where('user_id', $userId);
    }

    $preferences = $query->with('user.paperAccount')->get();

    if ($preferences->isEmpty()) {
        $this->line('No bots are currently running.');

        return 0;
    }

    $closedTotal = 0;
    $openedTotal = 0;

    foreach ($preferences as $preference) {
        $user = $preference->user;
        $account = $user?->paperAccount;
        if (! $user || ! $account) {
            continue;
        }

        try {
            $closed = $autoClose->handle($account, $preference);
            $closedTotal += count($closed);

            $assetType = $preference->bot_asset_type;
            $maxOpen = (int) ($preference->max_open_positions ?? 10);
            if ($assetType) {
                $account->refresh();
                $openCount = $account->positions()
                    ->whereHas('symbol', fn ($q) => $q->where('asset_type', $assetType))
                    ->count();
                if ($openCount < $maxOpen && (float) $account->cash_balance > 0) {
                    $result = $seed->openFreshPositions($account, $preference, $assetType);
                    $openedTotal += $result['opened'] ?? 0;
                    if (! empty($result['symbols'])) {
                        $this->line(sprintf('Opened for %s (%s): %s',
                            $user->email,
                            $assetType,
                            implode(', ', $result['symbols'])
                        ));
                    }
                }
            }

            if ($closed) {
                $this->line(sprintf('Closed for %s: %s',
                    $user->email,
                    implode(', ', $closed)
                ));
            }
        } catch (\Throwable $error) {
            Log::error('trader:tick failed for user '.$user->id.': '.$error->getMessage(), [
                'exception' => $error,
            ]);
            $this->error('User '.$user->email.' tick failed: '.$error->getMessage());
        }
    }

    $this->info(sprintf(
        'trader:tick processed %d bot(s): closed=%d opened=%d',
        $preferences->count(),
        $closedTotal,
        $openedTotal
    ));

    return 0;
})->purpose('Run the AI trader automation cycle (auto-close + open fresh positions) for every active bot');

Schedule::command('trader:tick')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

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

Artisan::command('trader:reset {email?} {--keep-balance}', function (): int {
    $email = $this->argument('email');
    $keepBalance = (bool) $this->option('keep-balance');

    $query = App\Models\User::query();
    if ($email) {
        $query->where('email', $email);
    }
    $users = $query->get();

    if ($users->isEmpty()) {
        $this->error($email ? "No user with email {$email}." : 'No users found.');

        return 1;
    }

    foreach ($users as $user) {
        Illuminate\Support\Facades\DB::transaction(function () use ($user, $keepBalance): void {
            $account = $user->paperAccount;
            if (! $account) {
                return;
            }

            $orderCount = $account->orders()->count();
            $positionCount = $account->positions()->count();
            $ledgerCount = $account->ledgerEntries()
                ->whereIn('type', ['trade_buy', 'trade_sell'])
                ->count();

            // Wipe the trade history so the user starts with a clean slate.
            $account->orders()->delete();
            $account->positions()->delete();
            $account->ledgerEntries()
                ->whereIn('type', ['trade_buy', 'trade_sell'])
                ->delete();

            // Reset the bot to a stopped state with no selected asset class.
            $user->preferences()->update([
                'bot_running' => false,
                'bot_asset_type' => null,
                'bot_started_at' => null,
                'bot_stopped_at' => null,
            ]);

            // Keep cash_balance ledger-consistent: deposits minus withdrawals
            // plus any non-trade adjustments that survived the wipe.
            if (! $keepBalance) {
                $deposits = (float) $account->total_deposits;
                $withdrawals = (float) $account->total_withdrawals;
                $adjustments = (float) $account->ledgerEntries()
                    ->whereNotIn('type', ['trade_buy', 'trade_sell'])
                    ->sum('amount');

                // total_deposits/total_withdrawals are the cumulative running
                // totals; the adjustments sum already includes deposit/withdrawal
                // ledger amounts, so we use it as the canonical balance.
                $account->update(['cash_balance' => round($adjustments, 4)]);
            }

            $this->info(sprintf(
                'Reset %s — orders=%d positions=%d trade-ledger=%d new_balance=$%s',
                $user->email,
                $orderCount,
                $positionCount,
                $ledgerCount,
                number_format((float) $account->fresh()->cash_balance, 2)
            ));
        });
    }

    return 0;
})->purpose('Wipe trade history (orders, positions, trade ledger) for a user; rebuilds balance from deposits/withdrawals unless --keep-balance');
