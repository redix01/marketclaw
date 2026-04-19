<?php

namespace App\Services;

use App\Models\Symbol;

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
}
