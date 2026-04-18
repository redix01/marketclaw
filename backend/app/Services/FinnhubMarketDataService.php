<?php

namespace App\Services;

use App\Models\MarketQuote;
use App\Models\Symbol;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

class FinnhubMarketDataService
{
    public function isConfigured(): bool
    {
        return filled(config('services.finnhub.key'));
    }

    public function refreshStaleStockQuotes(int $staleMinutes = 5): int
    {
        if (! $this->isConfigured()) {
            return 0;
        }

        $threshold = now()->subMinutes($staleMinutes);

        $symbols = Symbol::query()
            ->where('asset_type', 'stock')
            ->where('is_active', true)
            ->where('tradeable', true)
            ->where(function ($query) use ($threshold): void {
                $query->whereDoesntHave('latestQuote')
                    ->orWhereHas('latestQuote', function ($latestQuote) use ($threshold): void {
                        $latestQuote->where('quoted_at', '<', $threshold);
                    });
            })
            ->get();

        $updated = 0;

        foreach ($symbols as $symbol) {
            if ($this->refreshSymbolQuote($symbol)) {
                $updated++;
            }
        }

        return $updated;
    }

    public function refreshSymbolQuote(Symbol $symbol): ?MarketQuote
    {
        if (! $this->isConfigured() || $symbol->asset_type !== 'stock') {
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
        $response = Http::baseUrl((string) config('services.finnhub.base_url'))
            ->acceptJson()
            ->timeout(10)
            ->retry(2, 250)
            ->get('/quote', [
                'symbol' => $symbol,
                'token' => config('services.finnhub.key'),
            ]);

        if (! $response->successful()) {
            return null;
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            return null;
        }

        $current = isset($payload['c']) ? (float) $payload['c'] : 0.0;

        if ($current <= 0) {
            return null;
        }

        $previousClose = isset($payload['pc']) ? (float) $payload['pc'] : 0.0;
        $change = isset($payload['d']) ? (float) $payload['d'] : ($current - $previousClose);
        $changePercent = isset($payload['dp'])
            ? (float) $payload['dp']
            : ($previousClose > 0 ? (($change / $previousClose) * 100) : 0.0);
        $quotedAt = isset($payload['t']) && (int) $payload['t'] > 0
            ? Carbon::createFromTimestamp((int) $payload['t'])
            : now();

        return [
            'price' => $current,
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
