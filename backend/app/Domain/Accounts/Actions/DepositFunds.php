<?php

namespace App\Domain\Accounts\Actions;

use App\Models\PaperAccount;
use Illuminate\Support\Facades\DB;

class DepositFunds
{
    public function handle(PaperAccount $account, float $amount, string $description = 'Manual deposit'): PaperAccount
    {
        DB::transaction(function () use ($account, $amount, $description): void {
            $account->refresh();

            $account->update([
                'cash_balance' => $account->cash_balance + $amount,
                'total_deposits' => $account->total_deposits + $amount,
            ]);

            $account->ledgerEntries()->create([
                'user_id' => $account->user_id,
                'type' => 'deposit',
                'amount' => $amount,
                'description' => $description,
                'meta' => [
                    'source' => 'api',
                ],
            ]);
        });

        return $account->fresh();
    }
}
