<?php

namespace App\Domain\Trading\Actions;

use App\Models\Order;
use App\Models\PaperAccount;
use App\Models\Position;
use App\Models\UserPreference;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoCloseProfitablePositions
{
    /**
     * Walks every open position and closes ones that have hit the user-configured
     * take-profit (or emergency stop) threshold. Realized P&L is credited back
     * to the paper wallet via DepositFunds-equivalent ledger entries so the bot
     * compounds wins. Skipped entirely when the user has not started the bot.
     */
    public function handle(PaperAccount $account, ?UserPreference $preference = null): array
    {
        $preference = $preference ?? $account->user->preferences;

        // Bot must be running for the auto-close engine to act on any position.
        if (! $preference || ! $preference->bot_running) {
            return [];
        }

        $autoCloseEnabled = (bool) ($preference->auto_close_enabled ?? true);
        $takeProfitPercent = (float) ($preference->take_profit_percent ?? 2.0);
        $emergencyStopPercent = (float) ($preference->emergency_stop_percent ?? 5.0);

        $closed = [];
        $positions = $account->positions()->with(['symbol.latestQuote'])->get();

        Log::info('AutoCloseProfitablePositions: bot_running=1 checking '
            .$positions->count().' positions tp='.$takeProfitPercent.'% stop='.$emergencyStopPercent.'%');

        foreach ($positions as $position) {
            $latestQuote = $position->symbol->latestQuote;
            if (! $latestQuote) {
                continue;
            }

            $currentPrice = (float) $latestQuote->price;
            $entryPrice = (float) $position->average_entry_price;

            if ($entryPrice <= 0) {
                continue;
            }

            $pnlPercent = (($currentPrice - $entryPrice) / $entryPrice) * 100;

            $hitTakeProfit = $autoCloseEnabled && $pnlPercent >= $takeProfitPercent;
            $hitStopLoss = $pnlPercent <= -$emergencyStopPercent;

            if ($hitTakeProfit || $hitStopLoss) {
                $reason = $hitTakeProfit ? 'take_profit' : 'stop_loss';
                $this->closePosition($account, $position, $currentPrice, $pnlPercent, $reason);
                $closed[] = $position->symbol->ticker.':'.$reason;
            }
        }

        if ($closed) {
            Log::info('AutoCloseProfitablePositions: closed '.implode(', ', $closed));
        }

        return $closed;
    }

    protected function closePosition(
        PaperAccount $account,
        Position $position,
        float $currentPrice,
        float $pnlPercent,
        string $reason,
    ): void {
        DB::transaction(function () use ($account, $position, $currentPrice, $pnlPercent, $reason): void {
            $quantity = (float) $position->quantity;
            $totalValue = $quantity * $currentPrice;
            $entryPrice = (float) $position->average_entry_price;
            $realizedPnl = $totalValue - ($quantity * $entryPrice);

            $order = $account->orders()->create([
                'user_id' => $account->user_id,
                'symbol_id' => $position->symbol_id,
                'agent_id' => null,
                'side' => 'sell',
                'order_type' => 'market',
                'quantity' => $quantity,
                'submitted_price' => $currentPrice,
                'fill_price' => $currentPrice,
                'status' => 'filled',
                'source' => 'bot',
                'submitted_at' => now(),
                'filled_at' => now(),
            ]);

            // Credit the full sale proceeds back to the wallet — this is what
            // makes realized P&L compound between cycles.
            $account->update([
                'cash_balance' => $account->cash_balance + $totalValue,
            ]);

            $position->delete();

            $account->ledgerEntries()->create([
                'user_id' => $account->user_id,
                'type' => 'trade_sell',
                'amount' => $totalValue,
                'description' => sprintf(
                    'Auto-closed (%s) %s %s @ %s (%.2f%%, %s$%s realized)',
                    $reason,
                    $quantity,
                    $position->symbol->ticker,
                    $currentPrice,
                    $pnlPercent,
                    $realizedPnl >= 0 ? '+' : '-',
                    number_format(abs($realizedPnl), 2)
                ),
                'reference_type' => Order::class,
                'reference_id' => $order->id,
                'meta' => [
                    'symbol' => $position->symbol->ticker,
                    'side' => 'sell',
                    'quantity' => $quantity,
                    'price' => $currentPrice,
                    'source' => 'bot',
                    'realized_pnl' => round($realizedPnl, 2),
                    'pnl_percent' => round($pnlPercent, 2),
                    'auto_closed' => true,
                    'reason' => $reason,
                ],
            ]);
        });
    }
}
