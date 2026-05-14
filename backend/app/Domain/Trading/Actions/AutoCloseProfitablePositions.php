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
     * take-profit (or emergency stop) threshold. The bot only acts when the user
     * has flipped the agent on, and only on the asset class they selected
     * (Stock vs Crypto trader). Realized P&L is credited back to the wallet
     * minus the platform commission so wins compound.
     */
    public function handle(PaperAccount $account, ?UserPreference $preference = null): array
    {
        $preference = $preference ?? $account->user->preferences;

        if (! $preference || ! $preference->bot_running) {
            return [];
        }

        $autoCloseEnabled = (bool) ($preference->auto_close_enabled ?? true);
        $takeProfitPercent = (float) ($preference->take_profit_percent ?? 2.0);
        $emergencyStopPercent = (float) ($preference->emergency_stop_percent ?? 5.0);
        $assetType = $preference->bot_asset_type;
        $commissionPercent = max(0.0, min(100.0, (float) ($preference->commission_percent ?? 20.0)));

        $closed = [];
        $query = $account->positions()->with(['symbol.latestQuote']);
        if ($assetType) {
            $query->whereHas('symbol', fn ($q) => $q->where('asset_type', $assetType));
        }
        $positions = $query->get();

        Log::info('AutoCloseProfitablePositions: bot_running=1 type='.($assetType ?? 'all')
            .' positions='.$positions->count()
            .' tp='.$takeProfitPercent.'% stop='.$emergencyStopPercent.'%'
            .' commission='.$commissionPercent.'%');

        foreach ($positions as $position) {
            $currentPrice = $position->resolvedCurrentPrice();
            if ($currentPrice <= 0) {
                continue;
            }
            $entryPrice = (float) $position->average_entry_price;

            if ($entryPrice <= 0) {
                continue;
            }

            $pnlPercent = (($currentPrice - $entryPrice) / $entryPrice) * 100;

            $hitTakeProfit = $autoCloseEnabled && $pnlPercent >= $takeProfitPercent;
            $hitStopLoss = $pnlPercent <= -$emergencyStopPercent;

            if ($hitTakeProfit || $hitStopLoss) {
                $reason = $hitTakeProfit ? 'take_profit' : 'stop_loss';
                $this->closePosition($account, $position, $currentPrice, $pnlPercent, $reason, $commissionPercent);
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
        float $commissionPercent,
    ): void {
        DB::transaction(function () use ($account, $position, $currentPrice, $pnlPercent, $reason, $commissionPercent): void {
            $quantity = (float) $position->quantity;
            $totalValue = $quantity * $currentPrice;
            $entryPrice = (float) $position->average_entry_price;
            $realizedPnl = $totalValue - ($quantity * $entryPrice);

            // Commission only bites profits — losers don't get charged.
            $commission = $realizedPnl > 0
                ? round($realizedPnl * ($commissionPercent / 100), 2)
                : 0.0;
            $netProceeds = $totalValue - $commission;
            $netRealized = $realizedPnl - $commission;

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

            // Net proceeds (sale value − commission) credited to the wallet so
            // the realized P&L compounds. Loss exits return the full sale.
            $account->update([
                'cash_balance' => $account->cash_balance + $netProceeds,
            ]);

            $position->delete();

            $account->ledgerEntries()->create([
                'user_id' => $account->user_id,
                'type' => 'trade_sell',
                'amount' => $netProceeds,
                'description' => sprintf(
                    'Auto-closed (%s) %s %s @ %s (%.2f%%, %s$%s realized%s)',
                    $reason,
                    $quantity,
                    $position->symbol->ticker,
                    $currentPrice,
                    $pnlPercent,
                    $netRealized >= 0 ? '+' : '-',
                    number_format(abs($netRealized), 2),
                    $commission > 0 ? sprintf(', −$%s commission', number_format($commission, 2)) : ''
                ),
                'reference_type' => Order::class,
                'reference_id' => $order->id,
                'meta' => [
                    'symbol' => $position->symbol->ticker,
                    'side' => 'sell',
                    'quantity' => $quantity,
                    'price' => $currentPrice,
                    'entry_price' => round($entryPrice, 6),
                    'exit_price' => round($currentPrice, 6),
                    'source' => 'bot',
                    'realized_pnl' => round($netRealized, 2),
                    'gross_realized_pnl' => round($realizedPnl, 2),
                    'commission' => $commission,
                    'commission_percent' => $commissionPercent,
                    'pnl_percent' => round($pnlPercent, 2),
                    'auto_closed' => true,
                    'reason' => $reason,
                ],
            ]);
        });
    }
}
