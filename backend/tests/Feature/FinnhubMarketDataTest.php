<?php

namespace Tests\Feature;

use App\Models\MarketQuote;
use App\Models\Symbol;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FinnhubMarketDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_market_symbols_endpoint_refreshes_stale_stock_quotes_from_finnhub(): void
    {
        Config::set('services.finnhub.key', 'test-finnhub-key');
        Config::set('services.finnhub.base_url', 'https://finnhub.io/api/v1');

        $stock = Symbol::create([
            'ticker' => 'AAPL',
            'name' => 'Apple Inc.',
            'asset_type' => 'stock',
            'is_active' => true,
            'tradeable' => true,
            'price_source' => 'finnhub',
        ]);

        $crypto = Symbol::create([
            'ticker' => 'BTC',
            'name' => 'Bitcoin',
            'asset_type' => 'crypto',
            'is_active' => true,
            'tradeable' => true,
            'price_source' => 'seed',
        ]);

        MarketQuote::create([
            'symbol_id' => $stock->id,
            'price' => 100.00000000,
            'change' => 1.00000000,
            'change_percent' => 1.0000,
            'quoted_at' => now()->subHours(2),
        ]);

        MarketQuote::create([
            'symbol_id' => $crypto->id,
            'price' => 65000.00000000,
            'change' => 1500.00000000,
            'change_percent' => 2.3500,
            'quoted_at' => now(),
        ]);

        Http::fake([
            'https://finnhub.io/api/v1/quote*' => Http::response([
                'c' => 193.45,
                'd' => 3.21,
                'dp' => 1.69,
                'pc' => 190.24,
                't' => now()->timestamp,
            ], 200),
        ]);

        $response = $this->getJson('/api/v1/markets/symbols');

        $response->assertOk();
        $response->assertJsonFragment([
            'symbol' => 'AAPL',
            'price' => 193.45,
            'change' => 3.21,
            'changePercent' => 1.69,
        ]);

        Http::assertSentCount(1);

        Http::assertSent(function ($request): bool {
            return $request->url() === 'https://finnhub.io/api/v1/quote?symbol=AAPL&token=test-finnhub-key';
        });
    }
}
