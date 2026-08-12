<?php

namespace Database\Seeders;

use App\Models\MarketQuote;
use App\Models\Symbol;
use Illuminate\Database\Seeder;

class MarketQuoteSeeder extends Seeder
{
    public function run(): void
    {
        // Reference quotes used when Finnhub / CoinMarketCap aren't configured.
        // The live cron will overwrite these with real data when API keys are
        // present. Only ticker → reference price is hard-coded; daily change
        // is synthesised so the dashboard isn't flat-zero on a fresh install.
        $referencePrices = [
            // Mega-cap tech
            'AAPL' => 185.92, 'MSFT' => 415.32, 'GOOGL' => 148.23, 'GOOG' => 149.55,
            'AMZN' => 178.45, 'META' => 492.11, 'TSLA' => 175.34, 'NVDA' => 875.28,
            'NFLX' => 665.42, 'AMD' => 176.58, 'INTC' => 31.84, 'ORCL' => 141.77,
            'CRM' => 314.52, 'ADBE' => 510.21, 'CSCO' => 49.85, 'AVGO' => 1325.10,
            'QCOM' => 168.42, 'TXN' => 195.30, 'IBM' => 188.65, 'NOW' => 765.40,
            'INTU' => 622.18, 'AMAT' => 215.62, 'MU' => 110.45, 'PYPL' => 67.20,
            'UBER' => 71.85, 'SHOP' => 80.55,

            // Communications / media
            'DIS' => 113.09, 'CMCSA' => 39.45, 'VZ' => 41.20, 'T' => 18.90, 'TMUS' => 168.40,

            // Financials
            'JPM' => 197.63, 'BAC' => 38.42, 'WFC' => 60.15, 'GS' => 478.90, 'MS' => 98.25,
            'C' => 64.30, 'BLK' => 825.50, 'SCHW' => 73.85, 'AXP' => 235.40,
            'V' => 275.80, 'MA' => 472.30, 'COF' => 142.20, 'USB' => 44.10, 'PNC' => 165.75,
            'BRK.B' => 415.20,

            // Healthcare / pharma
            'JNJ' => 158.40, 'PFE' => 28.65, 'MRK' => 125.30, 'ABBV' => 175.85, 'LLY' => 798.20,
            'BMY' => 50.30, 'TMO' => 590.45, 'ABT' => 110.55, 'DHR' => 250.10,
            'UNH' => 535.70, 'CVS' => 58.40, 'MDT' => 88.65, 'AMGN' => 305.20, 'GILD' => 72.85,

            // Consumer / retail
            'WMT' => 67.80, 'COST' => 825.40, 'HD' => 360.90, 'LOW' => 245.50, 'TGT' => 152.20,
            'NKE' => 86.40, 'SBUX' => 92.10, 'MCD' => 268.30, 'KO' => 65.30, 'PEP' => 168.40,
            'PG' => 162.55, 'CL' => 95.20, 'MDLZ' => 70.40, 'PM' => 110.30, 'MO' => 50.85,

            // Energy / industrials / materials
            'XOM' => 116.40, 'CVX' => 155.20, 'COP' => 110.45, 'SLB' => 47.85, 'OXY' => 60.30,
            'BA' => 175.20, 'CAT' => 348.70, 'GE' => 165.40, 'HON' => 215.80, 'MMM' => 130.55,
            'LMT' => 480.20, 'RTX' => 115.60, 'UPS' => 138.45, 'FDX' => 270.85, 'DE' => 410.20,

            // Auto / mobility
            'F' => 11.85, 'GM' => 50.20,

            // Utilities / real estate / misc
            'NEE' => 75.40, 'DUK' => 110.20, 'SO' => 84.50, 'PLD' => 115.30, 'SPG' => 162.80,

            // Crypto
            'BTC' => 68432.12, 'ETH' => 3845.67, 'SOL' => 145.23, 'BNB' => 582.44,
            'XRP' => 0.57, 'ADA' => 0.48, 'DOGE' => 0.16, 'AVAX' => 35.91, 'LINK' => 14.63,
        ];

        foreach ($referencePrices as $ticker => $price) {
            $symbol = Symbol::query()->where('ticker', $ticker)->first();
            if (! $symbol) {
                continue;
            }

            // Skip if this symbol already has any live quote — the seeder is
            // only meant to fill in the gap on fresh installs, not overwrite
            // real market data.
            if ($symbol->latestQuote()->exists()) {
                continue;
            }

            // Synthesise a plausible daily change (-3% .. +3%) so the dashboard
            // isn't flat-zero on a fresh install.
            $changePercent = round((mt_rand(-300, 300) / 100), 2);
            $change = round($price * ($changePercent / 100), 4);

            MarketQuote::create([
                'symbol_id' => $symbol->id,
                'price' => $price,
                'change' => $change,
                'change_percent' => $changePercent,
                'quoted_at' => now()->subMinutes(5),
            ]);
        }
    }
}
