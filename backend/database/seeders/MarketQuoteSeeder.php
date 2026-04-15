<?php

namespace Database\Seeders;

use App\Models\MarketQuote;
use App\Models\Symbol;
use Illuminate\Database\Seeder;

class MarketQuoteSeeder extends Seeder
{
    public function run(): void
    {
        $quotes = [
            'AAPL' => ['price' => 185.92, 'change' => 1.24, 'change_percent' => 0.67],
            'TSLA' => ['price' => 175.34, 'change' => -4.12, 'change_percent' => -2.30],
            'NVDA' => ['price' => 875.28, 'change' => 12.45, 'change_percent' => 1.44],
            'BTC' => ['price' => 68432.12, 'change' => 1245.32, 'change_percent' => 1.85],
            'ETH' => ['price' => 3845.67, 'change' => -45.21, 'change_percent' => -1.16],
            'SOL' => ['price' => 145.23, 'change' => 8.45, 'change_percent' => 6.18],
            'MSFT' => ['price' => 415.32, 'change' => 2.11, 'change_percent' => 0.51],
            'GOOGL' => ['price' => 148.23, 'change' => -0.45, 'change_percent' => -0.30],
            'AMZN' => ['price' => 178.45, 'change' => 1.67, 'change_percent' => 0.94],
        ];

        foreach ($quotes as $ticker => $quote) {
            $symbol = Symbol::query()->where('ticker', $ticker)->first();

            if (! $symbol) {
                continue;
            }

            MarketQuote::create([
                'symbol_id' => $symbol->id,
                'price' => $quote['price'],
                'change' => $quote['change'],
                'change_percent' => $quote['change_percent'],
                'quoted_at' => now(),
            ]);
        }
    }
}
