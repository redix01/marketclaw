<?php

namespace App\Domain\Trading\Actions;

use App\Models\Order;
use App\Models\PaperAccount;
use App\Models\Position;
use App\Models\Symbol;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitMarketOrder
{
    public function handle(
        PaperAccount $account,
        Symbol $symbol,
        string $side,
        float $quantity,
        ?float $submittedPrice = null,
        string $source = 'manual',
        ?int $agentId = null,
        bool $forceSubmittedPrice = false,
        array $tradeMeta = [],
    ): Order {
        if (! $symbol->is_active || ! $symbol->tradeable) {
            throw ValidationException::withMessages([
                'symbol' => 'This symbol is not currently tradeable.',
            ]);
        }

        $price = $this->resolveExecutionPrice($symbol, $submittedPrice, $forceSubmittedPrice);
        $totalValue = round($price * $quantity, 8);

        return DB::transaction(function () use ($account, $symbol, $side, $quantity, $submittedPrice, $source, $agentId, $price, $totalValue, $tradeMeta): Order {
            $account->refresh();

            if ($side === 'buy' && (float) $account->cash_balance < $totalValue) {
                throw ValidationException::withMessages([
                    'quantity' => 'Insufficient buying power for this order.',
                ]);
            }

            $position = $account->positions()
                ->where('symbol_id', $symbol->id)
                ->lockForUpdate()
                ->first();

            if ($side === 'sell' && (! $position || (float) $position->quantity < $quantity)) {
                throw ValidationException::withMessages([
                    'quantity' => 'Insufficient holdings to sell this quantity.',
                ]);
            }

            $order = $account->orders()->create([
                'user_id' => $account->user_id,
                'symbol_id' => $symbol->id,
                'agent_id' => $agentId,
                'side' => $side,
                'order_type' => 'market',
                'quantity' => $quantity,
                'submitted_price' => $submittedPrice ?? $price,
                'fill_price' => $price,
                'status' => 'filled',
                'source' => $source,
                'submitted_at' => now(),
                'filled_at' => now(),
            ]);

            $meta = [
                'symbol' => $symbol->ticker,
                'side' => $side,
                'quantity' => $quantity,
                'price' => $price,
                'source' => $source,
            ];

            if ($side === 'buy') {
                $this->applyBuy($account, $position, $symbol, $quantity, $price, $totalValue);
                $ledgerType = 'trade_buy';
                $ledgerAmount = -$totalValue;
                $description = sprintf('Bought %s %s @ %s', $quantity, $symbol->ticker, $price);
            } else {
                // Snapshot the entry price + realized P&L *before* mutating the
                // position so closed-trades reports show real numbers — and so
                // the user can see the realized P&L that just landed in their
                // wallet for every manual close, not just bot auto-closes.
                $entryPrice = (float) $position->average_entry_price;
                $realizedPnl = ($price - $entryPrice) * $quantity;
                $pnlPercent = $entryPrice > 0
                    ? (($price - $entryPrice) / $entryPrice) * 100
                    : 0.0;

                $this->applySell($account, $position, $quantity, $price, $totalValue);

                $ledgerType = 'trade_sell';
                $ledgerAmount = $totalValue;
                $description = sprintf(
                    'Sold %s %s @ %s (%s$%s realized, %.2f%%)',
                    $quantity,
                    $symbol->ticker,
                    $price,
                    $realizedPnl >= 0 ? '+' : '-',
                    number_format(abs($realizedPnl), 2),
                    $pnlPercent
                );

                $meta['entry_price'] = round($entryPrice, 6);
                $meta['exit_price'] = round($price, 6);
                $meta['realized_pnl'] = round($realizedPnl, 2);
                $meta['pnl_percent'] = round($pnlPercent, 2);
                $meta['auto_closed'] = false;
                $meta['closed_by_bot'] = $source === 'bot';
                $meta['close_reason'] = $source === 'bot' ? 'session_reset' : 'manual';
            }

            if ($tradeMeta !== []) {
                $meta = array_merge($meta, $tradeMeta);
            }

            $account->ledgerEntries()->create([
                'user_id' => $account->user_id,
                'type' => $ledgerType,
                'amount' => $ledgerAmount,
                'description' => $description,
                'reference_type' => Order::class,
                'reference_id' => $order->id,
                'meta' => $meta,
            ]);

            return $order->fresh(['symbol']);
        });
    }

    protected function resolveExecutionPrice(Symbol $symbol, ?float $submittedPrice, bool $forceSubmittedPrice = false): float
    {
        if ($forceSubmittedPrice && $submittedPrice !== null && $submittedPrice > 0) {
            return $submittedPrice;
        }

        $latestQuote = $symbol->latestQuote()->first();

        if ($latestQuote) {
            return (float) $latestQuote->price;
        }

        if ($submittedPrice !== null && $submittedPrice > 0) {
            return $submittedPrice;
        }

        throw ValidationException::withMessages([
            'symbol' => 'No market price is available for this symbol.',
        ]);
    }

    protected function applyBuy(
        PaperAccount $account,
        ?Position $position,
        Symbol $symbol,
        float $quantity,
        float $price,
        float $totalValue,
    ): void {
        $account->update([
            'cash_balance' => $account->cash_balance - $totalValue,
        ]);

        if ($position) {
            $newQuantity = (float) $position->quantity + $quantity;
            $newAverage = (((float) $position->quantity * (float) $position->average_entry_price) + $totalValue) / $newQuantity;

            $position->update([
                'quantity' => $newQuantity,
                'average_entry_price' => $newAverage,
                'market_value_snapshot' => $newQuantity * $price,
                'last_valued_at' => now(),
                'admin_price_override' => null,
                'admin_price_overridden_at' => null,
            ]);

            return;
        }

        $account->positions()->create([
            'symbol_id' => $symbol->id,
            'quantity' => $quantity,
            'average_entry_price' => $price,
            'market_value_snapshot' => $quantity * $price,
            'last_valued_at' => now(),
            'admin_price_override' => null,
            'admin_price_overridden_at' => null,
        ]);
    }

    protected function applySell(
        PaperAccount $account,
        Position $position,
        float $quantity,
        float $price,
        float $totalValue,
    ): void {
        $newQuantity = (float) $position->quantity - $quantity;

        $account->update([
            'cash_balance' => $account->cash_balance + $totalValue,
        ]);

        if ($newQuantity <= 0) {
            $position->delete();

            return;
        }

        $position->update([
            'quantity' => $newQuantity,
            'market_value_snapshot' => $newQuantity * $price,
            'last_valued_at' => now(),
            'admin_price_override' => null,
            'admin_price_overridden_at' => null,
        ]);
    }
}
