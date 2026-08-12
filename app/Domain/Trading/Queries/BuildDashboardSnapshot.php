<?php

namespace App\Domain\Trading\Queries;

use App\Models\PaperAccount;
use Illuminate\Support\Collection;
use App\Support\Api\FrontendPayload;

class BuildDashboardSnapshot
{
    public function handle(PaperAccount $account): array
    {
        $account->loadMissing([
            'user',
            'user.preferences',
            'positions.symbol.latestQuote',
            'orders.symbol',
            'ledgerEntries',
        ]);

        $positions = $account->positions->map(fn ($position) => FrontendPayload::position($position));
        $ledgerEntries = $account->ledgerEntries->sortBy('created_at')->values();

        $holdingsValue = $positions->sum('market_value');
        $cashBalance = (float) $account->cash_balance;
        $totalEquity = $cashBalance + $holdingsValue;

        return [
            'user' => FrontendPayload::user($account->user),
            'preferences' => $account->user->preferences ? FrontendPayload::preference($account->user->preferences) : null,
            'account' => FrontendPayload::account($account),
            'summary' => [
                'holdings_value' => $holdingsValue,
                'total_equity' => $totalEquity,
                'unrealized_pl' => $positions->sum('unrealized_pl'),
                'open_positions_count' => $positions->count(),
                'recent_orders_count' => $account->orders->count(),
            ],
            'equity_curve' => $this->buildEquityCurve($positions, $ledgerEntries),
            'asset_allocation' => $this->buildAssetAllocation($positions, $cashBalance),
            'positions' => $positions->values()->all(),
            'recent_orders' => $account->orders
                ->sortByDesc('created_at')
                ->take(10)
                ->map(fn ($order) => FrontendPayload::order($order))
                ->values()
                ->all(),
            'recent_ledger' => $account->ledgerEntries
                ->sortByDesc('created_at')
                ->take(10)
                ->map(fn ($entry) => FrontendPayload::ledgerEntry($entry))
                ->values()
                ->all(),
        ];
    }

    protected function buildAssetAllocation(Collection $positions, float $cashBalance): array
    {
        $allocation = [];

        if ($cashBalance > 0) {
            $allocation[] = [
                'name' => 'Cash',
                'value' => round($cashBalance, 2),
                'color' => '#10b981',
            ];
        }

        foreach ($positions->groupBy('asset_type') as $assetType => $assetPositions) {
            $allocation[] = [
                'name' => ucfirst((string) $assetType),
                'value' => round((float) $assetPositions->sum('market_value'), 2),
                'color' => $assetType === 'crypto' ? '#f59e0b' : '#3b82f6',
            ];
        }

        return $allocation;
    }

    protected function buildEquityCurve(Collection $positions, Collection $ledgerEntries): array
    {
        $latestPrices = $positions
            ->mapWithKeys(fn (array $position) => [$position['symbol'] => (float) $position['current_price']]);

        $simulatedCash = 0.0;
        $simulatedPositions = [];
        $curve = [];

        foreach ($ledgerEntries as $entry) {
            $type = $entry->type;
            $amount = (float) $entry->amount;
            $meta = $entry->meta ?? [];

            if ($type === 'trade_buy' || $type === 'trade_sell') {
                $symbol = $meta['symbol'] ?? null;
                $quantity = isset($meta['quantity']) ? (float) $meta['quantity'] : 0.0;
                $price = isset($meta['price']) ? (float) $meta['price'] : null;

                if ($symbol && $quantity > 0 && $price !== null) {
                    $position = $simulatedPositions[$symbol] ?? ['quantity' => 0.0, 'average_entry_price' => 0.0];

                    if ($type === 'trade_buy') {
                        $newQuantity = $position['quantity'] + $quantity;
                        $newAverage = $newQuantity > 0
                            ? (($position['quantity'] * $position['average_entry_price']) + ($quantity * $price)) / $newQuantity
                            : 0.0;

                        $simulatedPositions[$symbol] = [
                            'quantity' => $newQuantity,
                            'average_entry_price' => $newAverage,
                        ];
                    } else {
                        $remainingQuantity = $position['quantity'] - $quantity;

                        if ($remainingQuantity <= 0) {
                            unset($simulatedPositions[$symbol]);
                        } else {
                            $simulatedPositions[$symbol] = [
                                'quantity' => $remainingQuantity,
                                'average_entry_price' => $position['average_entry_price'],
                            ];
                        }
                    }
                }
            }

            $simulatedCash += $amount;

            $holdingsValue = collect($simulatedPositions)->sum(function (array $position, string $symbol) use ($latestPrices): float {
                $markPrice = (float) ($latestPrices->get($symbol) ?? $position['average_entry_price']);

                return $position['quantity'] * $markPrice;
            });

            $curve[] = [
                'label' => $entry->created_at->format('M j'),
                'value' => round($simulatedCash + $holdingsValue, 2),
                'timestamp' => $entry->created_at->toISOString(),
            ];
        }

        if ($curve === []) {
            $curve[] = [
                'label' => now()->format('M j'),
                'value' => round((float) $positions->sum('market_value'), 2),
                'timestamp' => now()->toISOString(),
            ];
        }

        return array_values($curve);
    }
}
