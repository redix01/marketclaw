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
            'META' => ['price' => 492.11, 'change' => 4.72, 'change_percent' => 0.97],
            'NFLX' => ['price' => 665.42, 'change' => 8.21, 'change_percent' => 1.25],
            'AMD' => ['price' => 176.58, 'change' => 2.14, 'change_percent' => 1.23],
            'INTC' => ['price' => 31.84, 'change' => 0.42, 'change_percent' => 1.34],
            'ORCL' => ['price' => 141.77, 'change' => 1.08, 'change_percent' => 0.77],
            'CRM' => ['price' => 314.52, 'change' => 3.12, 'change_percent' => 1.00],
            'JPM' => ['price' => 197.63, 'change' => 1.56, 'change_percent' => 0.79],
            'BAC' => ['price' => 38.42, 'change' => 0.21, 'change_percent' => 0.55],
            'DIS' => ['price' => 113.09, 'change' => 0.87, 'change_percent' => 0.77],
            'BTC' => ['price' => 68432.12, 'change' => 1245.32, 'change_percent' => 1.85],
            'ETH' => ['price' => 3845.67, 'change' => -45.21, 'change_percent' => -1.16],
            'SOL' => ['price' => 145.23, 'change' => 8.45, 'change_percent' => 6.18],
            'BNB' => ['price' => 582.44, 'change' => 9.38, 'change_percent' => 1.64],
            'XRP' => ['price' => 0.57, 'change' => 0.01, 'change_percent' => 1.79],
            'ADA' => ['price' => 0.48, 'change' => 0.02, 'change_percent' => 4.35],
            'DOGE' => ['price' => 0.16, 'change' => 0.005, 'change_percent' => 3.23],
            'AVAX' => ['price' => 35.91, 'change' => 1.12, 'change_percent' => 3.22],
            'LINK' => ['price' => 14.63, 'change' => 0.41, 'change_percent' => 2.88],
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
                'quoted_at' => now()->subHours(2),
            ]);
        }
    }
}
