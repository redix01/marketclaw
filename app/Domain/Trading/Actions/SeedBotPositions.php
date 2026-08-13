<?php

namespace App\Domain\Trading\Actions;

use App\Models\PaperAccount;
use App\Models\Position;
use App\Models\Symbol;
use App\Models\UserPreference;
use App\Services\MarketDataRefreshService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SeedBotPositions
{
    public function __construct(
        protected SubmitMarketOrder $submitMarketOrder,
        protected MarketDataRefreshService $marketDataRefreshService,
    ) {
    }

    public function closeExistingPositions(PaperAccount $account, string $assetType): int
    {
        $positions = $account->positions()
            ->with(['symbol.latestQuote'])
            ->whereHas('symbol', fn ($query) => $query->where('asset_type', $assetType))
            ->get();

        $closed = 0;

        foreach ($positions as $position) {
            $price = $position->resolvedCurrentPrice();
            if ($price <= 0) {
                continue;
            }

            $this->submitMarketOrder->handle(
                $account->fresh(),
                $position->symbol,
                'sell',
                (float) $position->quantity,
                $price,
                'bot',
                null,
                true,
                [
                    'auto_closed' => false,
                    'closed_by_bot' => true,
                    'close_reason' => 'session_reset',
                ],
            );
            $closed += 1;
        }

        return $closed;
    }

    public function openFreshPositions(PaperAccount $account, UserPreference $preference, string $assetType): array
    {
        $heldSymbolIds = $account->positions()
            ->whereHas('symbol', fn ($query) => $query->where('asset_type', $assetType))
            ->pluck('symbol_id');

        $symbols = Symbol::query()
            ->with('latestQuote')
            ->where('asset_type', $assetType)
            ->where('is_active', true)
            ->where('tradeable', true)
            ->get()
            ->reject(fn (Symbol $symbol): bool => $heldSymbolIds->contains($symbol->id))
            ->filter(fn (Symbol $symbol) => (float) optional($symbol->latestQuote)->price > 0)
            ->sortByDesc(fn (Symbol $symbol) => abs((float) optional($symbol->latestQuote)->change_percent))
            ->values();

        if ($symbols->isEmpty()) {
            return ['opened' => 0, 'symbols' => []];
        }

        $maxOpenPositions = max(1, (int) ($preference->max_open_positions ?? 1));
        $remainingSlots = min(max(0, $maxOpenPositions - $heldSymbolIds->count()), $symbols->count());
        if ($remainingSlots === 0) {
            return ['opened' => 0, 'symbols' => []];
        }

        $walletExposurePercent = max(1, min(100, (int) ($preference->wallet_exposure_percent ?? 25)));

        $account->refresh();
        $cashBalance = (float) $account->cash_balance;
        if ($cashBalance <= 0) {
            return ['opened' => 0, 'symbols' => []];
        }

        $capital = min($cashBalance, $cashBalance * ($walletExposurePercent / 100));
        $capitalPerPosition = $capital / $remainingSlots;

        $openedSymbols = [];

        foreach ($symbols->take($remainingSlots) as $symbol) {
            $price = (float) optional($symbol->latestQuote)->price;
            if ($price <= 0 || $capitalPerPosition <= 0) {
                continue;
            }

            $quantity = round($capitalPerPosition / $price, $assetType === 'crypto' ? 8 : 4);
            if ($quantity <= 0) {
                continue;
            }

            $account->refresh();
            if ((float) $account->cash_balance < $price * $quantity) {
                continue;
            }

            $this->submitMarketOrder->handle(
                $account,
                $symbol,
                'buy',
                $quantity,
                $price,
                'bot',
            );

            $openedSymbols[] = $symbol->ticker;
        }

        return [
            'opened' => count($openedSymbols),
            'symbols' => $openedSymbols,
        ];
    }
}
