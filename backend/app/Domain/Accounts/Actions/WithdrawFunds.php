<?php

namespace App\Domain\Accounts\Actions;

use App\Models\PaperAccount;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WithdrawFunds
{
    public function handle(
        PaperAccount $account,
        float $amount,
        string $description = 'Manual withdrawal',
        string $source = 'api',
        array $meta = [],
    ): PaperAccount
    {
        DB::transaction(function () use ($account, $amount, $description, $source, $meta): void {
            $account->refresh();

            if ((float) $account->cash_balance < $amount) {
                throw ValidationException::withMessages([
                    'amount' => 'Insufficient paper cash balance.',
                ]);
            }

            $account->update([
                'cash_balance' => $account->cash_balance - $amount,
                'total_withdrawals' => $account->total_withdrawals + $amount,
            ]);

            $account->ledgerEntries()->create([
                'user_id' => $account->user_id,
                'type' => 'withdrawal',
                'amount' => -$amount,
                'description' => $description,
                'meta' => array_merge([
                    'source' => $source,
                ], $meta),
            ]);
        });

        return $account->fresh();
    }
}
