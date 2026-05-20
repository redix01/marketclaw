<?php

namespace App\Services;

use App\Models\MarketQuote;
use App\Models\Symbol;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FinnhubMarketDataService
{
    /**
     * Finnhub free tier allows 60 calls/min. We pace ourselves to stay
     * comfortably under that and bail out of a sync cycle the moment we
     * see a 429 so we don't burn the next minute's budget on retries.
     */
    private const MAX_CALLS_PER_CYCLE = 55;
    private const PACE_MICROSECONDS = 1_100_000; // ~1.1s between calls

    private bool $rateLimitTripped = false;

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
            // Oldest quotes first so symbols that have never been refreshed
            // get serviced before ones that are merely a little stale.
            ->orderByRaw('(select coalesce(max(quoted_at), \'1970-01-01\') from market_quotes where market_quotes.symbol_id = symbols.id) asc')
            ->get();

        $this->rateLimitTripped = false;
        $updated = 0;
        $attempts = 0;

        foreach ($symbols as $symbol) {
            if ($attempts >= self::MAX_CALLS_PER_CYCLE) {
                Log::info('FinnhubMarketDataService: hit per-cycle call cap, deferring '.($symbols->count() - $attempts).' symbol(s) to next tick.');
                break;
            }
            if ($this->rateLimitTripped) {
                Log::warning('FinnhubMarketDataService: 429 from Finnhub, bailing this cycle.');
                break;
            }

            $attempts++;
            if ($this->refreshSymbolQuote($symbol)) {
                $updated++;
            }

            // Pace ourselves so 55 calls take ~60s — keeps the free tier
            // happy without coalescing all bursts to the cycle's start.
            if ($attempts < self::MAX_CALLS_PER_CYCLE) {
                usleep(self::PACE_MICROSECONDS);
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
        // Retry only on transient network failures — never on 4xx (especially
        // 429), which would just multiply our rate-limit burn.
        $response = Http::baseUrl((string) config('services.finnhub.base_url'))
            ->acceptJson()
            ->timeout(10)
            ->retry(2, 250, function ($exception): bool {
                if ($exception instanceof \Illuminate\Http\Client\ConnectionException) {
                    return true;
                }
                if (method_exists($exception, 'response') && $exception->response) {
                    $status = $exception->response->status();

                    return $status >= 500 && $status < 600;
                }

                return false;
            }, throw: false)
            ->get('/quote', [
                'symbol' => $symbol,
                'token' => config('services.finnhub.key'),
            ]);

        if ($response->status() === 429) {
            $this->rateLimitTripped = true;

            return null;
        }

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
