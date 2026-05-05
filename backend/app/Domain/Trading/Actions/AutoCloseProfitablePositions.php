<?php

namespace App\Domain\Trading\Actions;

use App\Models\MarketQuote;
use App\Models\Order;
use App\Models\PaperAccount;
use App\Models\Position;
use Illuminate\Support\Facades\DB;

class AutoCloseProfitablePositions
{
    public function handle(PaperAccount $account, float $takeProfitPercent = 2.0): array
    {
        $closed = [];
        $positions = $account->positions()->with(['symbol.latestQuote'])->get();

        \Illuminate\Support\Facades\Log::info('AutoCloseProfitablePositions: Checking '.$positions->count().' positions with threshold '.$takeProfitPercent.'%');

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

            \Illuminate\Support\Facades\Log::info('AutoCloseProfitablePositions: '.$position->symbol->ticker.' entry='.$entryPrice.' current='.$currentPrice.' pnl='.$pnlPercent.'%');

            if ($pnlPercent >= $takeProfitPercent) {
                $this->closePosition($account, $position, $currentPrice, $pnlPercent);
                $closed[] = $position->symbol->ticker;
            }
        }

        if (count($closed) > 0) {
            \Illuminate\Support\Facades\Log::info('AutoCloseProfitablePositions: CLOSED '.implode(', ', $closed));
        }

        return $closed;
    }

    protected function closePosition(
        PaperAccount $account,
        Position $position,
        float $currentPrice,
        float $pnlPercent,
    ): void {
        DB::transaction(function () use ($account, $position, $currentPrice, $pnlPercent): void {
            $quantity = (float) $position->quantity;
            $totalValue = $quantity * $currentPrice;
            $realizedPnl = $totalValue - ($quantity * (float) $position->average_entry_price);

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

            $account->update([
                'cash_balance' => $account->cash_balance + $totalValue,
            ]);

            $position->delete();

            $account->ledgerEntries()->create([
                'user_id' => $account->user_id,
                'type' => 'trade_sell',
                'amount' => $totalValue,
                'description' => sprintf(
                    'Auto-closed %s %s @ %s (%.2f%% profit, +$%s realized)',
                    $quantity,
                    $position->symbol->ticker,
                    $currentPrice,
                    $pnlPercent,
                    number_format($realizedPnl, 2)
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
                ],
            ]);
        });
    }
}
