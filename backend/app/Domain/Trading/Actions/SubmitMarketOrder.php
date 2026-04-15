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
    ): Order {
        if (! $symbol->is_active || ! $symbol->tradeable) {
            throw ValidationException::withMessages([
                'symbol' => 'This symbol is not currently tradeable.',
            ]);
        }

        $price = $this->resolveExecutionPrice($symbol, $submittedPrice);
        $totalValue = round($price * $quantity, 8);

        return DB::transaction(function () use ($account, $symbol, $side, $quantity, $submittedPrice, $source, $agentId, $price, $totalValue): Order {
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

            if ($side === 'buy') {
                $this->applyBuy($account, $position, $symbol, $quantity, $price, $totalValue);
                $ledgerType = 'trade_buy';
                $ledgerAmount = -$totalValue;
                $description = sprintf('Bought %s %s @ %s', $quantity, $symbol->ticker, $price);
            } else {
                $this->applySell($account, $position, $quantity, $totalValue);
                $ledgerType = 'trade_sell';
                $ledgerAmount = $totalValue;
                $description = sprintf('Sold %s %s @ %s', $quantity, $symbol->ticker, $price);
            }

            $account->ledgerEntries()->create([
                'user_id' => $account->user_id,
                'type' => $ledgerType,
                'amount' => $ledgerAmount,
                'description' => $description,
                'reference_type' => Order::class,
                'reference_id' => $order->id,
                'meta' => [
                    'symbol' => $symbol->ticker,
                    'side' => $side,
                    'quantity' => $quantity,
                    'price' => $price,
                    'source' => $source,
                ],
            ]);

            return $order->fresh(['symbol']);
        });
    }

    protected function resolveExecutionPrice(Symbol $symbol, ?float $submittedPrice): float
    {
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
            ]);

            return;
        }

        $account->positions()->create([
            'symbol_id' => $symbol->id,
            'quantity' => $quantity,
            'average_entry_price' => $price,
            'market_value_snapshot' => $quantity * $price,
            'last_valued_at' => now(),
        ]);
    }

    protected function applySell(
        PaperAccount $account,
        Position $position,
        float $quantity,
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
            'market_value_snapshot' => $newQuantity * (float) $position->average_entry_price,
            'last_valued_at' => now(),
        ]);
    }
}
