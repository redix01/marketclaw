<?php

namespace App\Domain\Trading\Queries;

use App\Models\PaperAccount;
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
}
