<?php

namespace App\Services\Admin;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Models\LedgerEntry;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminLedgerTransactionService
{
    public function __construct(
        protected EnsurePaperAccount $ensurePaperAccount,
    ) {
    }

    public function create(User $user, string $type, float $amount, string $description): LedgerEntry
    {
        $account = $this->ensurePaperAccount->handle($user);

        return DB::transaction(function () use ($account, $type, $amount, $description): LedgerEntry {
            $account->refresh();

            [$cashDelta, $depositDelta, $withdrawalDelta, $signedAmount] = $this->effectFor($type, $amount);
            $this->assertSufficientCash((float) $account->cash_balance + $cashDelta);

            $account->update([
                'cash_balance' => (float) $account->cash_balance + $cashDelta,
                'total_deposits' => (float) $account->total_deposits + $depositDelta,
                'total_withdrawals' => (float) $account->total_withdrawals + $withdrawalDelta,
            ]);

            return $account->ledgerEntries()->create([
                'user_id' => $account->user_id,
                'type' => $type,
                'amount' => $signedAmount,
                'description' => $description,
                'meta' => [
                    'source' => 'admin',
                    'editable' => true,
                ],
            ]);
        });
    }

    public function update(LedgerEntry $entry, string $type, float $amount, string $description): LedgerEntry
    {
        $this->guardEditable($entry);

        return DB::transaction(function () use ($entry, $type, $amount, $description): LedgerEntry {
            $entry->refresh();
            $account = $entry->paperAccount()->lockForUpdate()->firstOrFail();

            [$oldCash, $oldDeposits, $oldWithdrawals] = $this->effectFor($entry->type, abs((float) $entry->amount));
            [$newCash, $newDeposits, $newWithdrawals, $signedAmount] = $this->effectFor($type, $amount);

            $nextCash = (float) $account->cash_balance - $oldCash + $newCash;
            $nextDeposits = (float) $account->total_deposits - $oldDeposits + $newDeposits;
            $nextWithdrawals = (float) $account->total_withdrawals - $oldWithdrawals + $newWithdrawals;

            $this->assertSufficientCash($nextCash);
            $this->assertNonNegativeTotals($nextDeposits, $nextWithdrawals);

            $account->update([
                'cash_balance' => $nextCash,
                'total_deposits' => $nextDeposits,
                'total_withdrawals' => $nextWithdrawals,
            ]);

            $meta = $entry->meta ?? [];
            $meta['source'] = 'admin';
            $meta['editable'] = true;

            $entry->update([
                'type' => $type,
                'amount' => $signedAmount,
                'description' => $description,
                'meta' => $meta,
            ]);

            return $entry->fresh(['user', 'paperAccount']);
        });
    }

    public function delete(LedgerEntry $entry): void
    {
        $this->guardEditable($entry);

        DB::transaction(function () use ($entry): void {
            $entry->refresh();
            $account = $entry->paperAccount()->lockForUpdate()->firstOrFail();

            [$cashDelta, $depositDelta, $withdrawalDelta] = $this->effectFor($entry->type, abs((float) $entry->amount));
            $nextCash = (float) $account->cash_balance - $cashDelta;
            $nextDeposits = (float) $account->total_deposits - $depositDelta;
            $nextWithdrawals = (float) $account->total_withdrawals - $withdrawalDelta;

            $this->assertSufficientCash($nextCash);
            $this->assertNonNegativeTotals($nextDeposits, $nextWithdrawals);

            $account->update([
                'cash_balance' => $nextCash,
                'total_deposits' => $nextDeposits,
                'total_withdrawals' => $nextWithdrawals,
            ]);

            $entry->delete();
        });
    }

    protected function guardEditable(LedgerEntry $entry): void
    {
        $source = data_get($entry->meta, 'source');
        $editable = data_get($entry->meta, 'editable', false);

        if (! in_array($entry->type, ['deposit', 'withdrawal'], true) || $entry->reference_type !== null || $source === 'system' || ! $editable) {
            throw ValidationException::withMessages([
                'transaction' => 'This transaction cannot be edited or deleted.',
            ]);
        }
    }

    protected function effectFor(string $type, float $amount): array
    {
        if ($type === 'deposit') {
            return [$amount, $amount, 0.0, $amount];
        }

        return [-$amount, 0.0, $amount, -$amount];
    }

    protected function assertSufficientCash(float $cashBalance): void
    {
        if ($cashBalance < 0) {
            throw ValidationException::withMessages([
                'amount' => 'This change would make the user cash balance negative.',
            ]);
        }
    }

    protected function assertNonNegativeTotals(float $deposits, float $withdrawals): void
    {
        if ($deposits < 0 || $withdrawals < 0) {
            throw ValidationException::withMessages([
                'amount' => 'This change would make the account totals invalid.',
            ]);
        }
    }
}
