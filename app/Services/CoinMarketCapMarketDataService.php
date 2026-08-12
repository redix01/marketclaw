<?php

namespace App\Services;

use App\Models\MarketQuote;
use App\Models\Symbol;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

class CoinMarketCapMarketDataService
{
    public function isConfigured(): bool
    {
        return filled(config('services.coinmarketcap.key'));
    }

    public function refreshStaleCryptoQuotes(int $staleMinutes = 5): int
    {
        if (! $this->isConfigured()) {
            return 0;
        }

        $threshold = now()->subMinutes($staleMinutes);

        $symbols = Symbol::query()
            ->where('asset_type', 'crypto')
            ->where('is_active', true)
            ->where('tradeable', true)
            ->where(function ($query) use ($threshold): void {
                $query->whereDoesntHave('latestQuote')
                    ->orWhereHas('latestQuote', function ($latestQuote) use ($threshold): void {
                        $latestQuote->where('quoted_at', '<', $threshold);
                    });
            })
            ->get();

        return $this->refreshSymbols($symbols);
    }

    public function refreshSymbolQuote(Symbol $symbol): ?MarketQuote
    {
        if (! $this->isConfigured() || $symbol->asset_type !== 'crypto') {
            return null;
        }

        $quote = $this->fetchQuote($symbol->ticker);

        if ($quote === null) {
            return null;
        }

        return MarketQuote::create([
            'symbol_id' => $symbol->id,
            'price' => $quote['price'],
            'change' => $quote['change'],
            'change_percent' => $quote['change_percent'],
            'quoted_at' => $quote['quoted_at'],
        ]);
    }

    /**
     * @return array{price: float, change: float, change_percent: float, quoted_at: Carbon}|null
     */
    public function fetchQuote(string $symbol): ?array
    {
        $response = Http::baseUrl((string) config('services.coinmarketcap.base_url'))
            ->acceptJson()
            ->withHeaders([
                'X-CMC_PRO_API_KEY' => config('services.coinmarketcap.key'),
            ])
            ->timeout(10)
            ->retry(2, 250)
            ->get('/v1/cryptocurrency/quotes/latest', [
                'symbol' => $symbol,
                'convert' => 'USD',
            ]);

        if (! $response->successful()) {
            return null;
        }

        $payload = $response->json();

        if (! is_array($payload) || ! isset($payload['data'][$symbol]['quote']['USD'])) {
            return null;
        }

        $quoteData = $payload['data'][$symbol]['quote']['USD'];
        $price = isset($quoteData['price']) ? (float) $quoteData['price'] : 0.0;

        if ($price <= 0) {
            return null;
        }

        $changePercent = isset($quoteData['percent_change_24h']) ? (float) $quoteData['percent_change_24h'] : 0.0;
        $change = $price * ($changePercent / 100);
        $quotedAt = isset($quoteData['last_updated'])
            ? Carbon::parse((string) $quoteData['last_updated'])
            : now();

        return [
            'price' => $price,
            'change' => $change,
            'change_percent' => $changePercent,
            'quoted_at' => $quotedAt,
        ];
    }

    /**
     * @param  Collection<int, Symbol>  $symbols
     * @return int
     */
    public function refreshSymbols(Collection $symbols): int
    {
        $updated = 0;

        foreach ($symbols as $symbol) {
            if ($this->refreshSymbolQuote($symbol)) {
                $updated++;
            }
        }

        return $updated;
    }
}
