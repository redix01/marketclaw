<?php

namespace App\Domain\Accounts\Actions;

use App\Models\PaperAccount;
use App\Models\User;
use App\Models\UserPreference;

class EnsurePaperAccount
{
    public function handle(User $user, float $initialBalance = 10000): PaperAccount
    {
        $account = $user->paperAccount;

        if (! $account) {
            $account = $user->paperAccount()->create([
                'base_currency' => 'USD',
                'cash_balance' => $initialBalance,
                'total_deposits' => $initialBalance,
                'total_withdrawals' => 0,
                'status' => 'active',
            ]);

            $account->ledgerEntries()->create([
                'user_id' => $user->id,
                'type' => 'deposit',
                'amount' => $initialBalance,
                'description' => 'Initial paper trading funds',
                'meta' => [
                    'source' => 'system',
                ],
            ]);
        }

        if (! $user->preferences) {
            $user->preferences()->create([
                'auto_fill_orders' => true,
                'simulate_slippage' => false,
                'default_max_allocation_percent' => 10,
                'default_approval_mode' => 'auto_execute',
                'notification_preferences' => [
                    'email' => false,
                    'push' => false,
                ],
                'leverage' => 10,
                'take_profit_percent' => 2.0,
                'wallet_exposure_percent' => 25,
                'emergency_stop_percent' => 5.0,
                'max_open_positions' => 5,
                'auto_close_enabled' => true,
                'bot_running' => false,
            ]);
        }

        return $account->fresh(['user']);
    }
}
