<?php

namespace App\Services;

use App\Models\Symbol;
use Illuminate\Support\Collection;

class MarketDataRefreshService
{
    public function __construct(
        protected FinnhubMarketDataService $finnhubMarketDataService,
        protected CoinMarketCapMarketDataService $coinMarketCapMarketDataService,
    ) {
    }

    public function refreshStaleQuotes(int $staleMinutes = 5): int
    {
        return $this->finnhubMarketDataService->refreshStaleStockQuotes($staleMinutes)
            + $this->coinMarketCapMarketDataService->refreshStaleCryptoQuotes($staleMinutes);
    }

    public function refreshSymbolQuote(Symbol $symbol): void
    {
        if ($symbol->asset_type === 'crypto') {
            $this->coinMarketCapMarketDataService->refreshSymbolQuote($symbol);

            return;
        }

        $this->finnhubMarketDataService->refreshSymbolQuote($symbol);
    }

    /**
     * @param  Collection<int, Symbol>  $symbols
     */
    public function refreshSymbols(Collection $symbols): int
    {
        $symbols = $symbols
            ->filter(fn (Symbol $symbol) => $symbol->is_active && $symbol->tradeable)
            ->unique('id')
            ->values();

        return $this->finnhubMarketDataService->refreshSymbols(
            $symbols->where('asset_type', 'stock')->values()
        ) + $this->coinMarketCapMarketDataService->refreshSymbols(
            $symbols->where('asset_type', 'crypto')->values()
        );
    }
}
