<?php

namespace Database\Seeders;

use App\Models\Symbol;
use Illuminate\Database\Seeder;

class SymbolSeeder extends Seeder
{
    public function run(): void
    {
        // Curated S&P 100-style stock universe + extra mega caps so the AI
        // trader has ~100 US equities to rotate through out of the box. Live
        // quotes for these are pulled by Finnhub on the standard cron;
        // additional symbols can be appended via `php artisan symbols:sync-stocks`.
        $symbols = [
            // Mega-cap tech
            ['ticker' => 'AAPL', 'name' => 'Apple Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'MSFT', 'name' => 'Microsoft Corp.', 'asset_type' => 'stock'],
            ['ticker' => 'GOOGL', 'name' => 'Alphabet Inc. (Class A)', 'asset_type' => 'stock'],
            ['ticker' => 'GOOG', 'name' => 'Alphabet Inc. (Class C)', 'asset_type' => 'stock'],
            ['ticker' => 'AMZN', 'name' => 'Amazon.com Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'META', 'name' => 'Meta Platforms, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'TSLA', 'name' => 'Tesla, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'NVDA', 'name' => 'NVIDIA Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'NFLX', 'name' => 'Netflix, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'AMD', 'name' => 'Advanced Micro Devices, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'INTC', 'name' => 'Intel Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'ORCL', 'name' => 'Oracle Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'CRM', 'name' => 'Salesforce, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'ADBE', 'name' => 'Adobe Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'CSCO', 'name' => 'Cisco Systems, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'AVGO', 'name' => 'Broadcom Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'QCOM', 'name' => 'QUALCOMM Incorporated', 'asset_type' => 'stock'],
            ['ticker' => 'TXN', 'name' => 'Texas Instruments Incorporated', 'asset_type' => 'stock'],
            ['ticker' => 'IBM', 'name' => 'International Business Machines Corp.', 'asset_type' => 'stock'],
            ['ticker' => 'NOW', 'name' => 'ServiceNow, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'INTU', 'name' => 'Intuit Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'AMAT', 'name' => 'Applied Materials, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'MU', 'name' => 'Micron Technology, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'PYPL', 'name' => 'PayPal Holdings, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'UBER', 'name' => 'Uber Technologies, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'SHOP', 'name' => 'Shopify Inc.', 'asset_type' => 'stock'],

            // Communications / media
            ['ticker' => 'DIS', 'name' => 'The Walt Disney Company', 'asset_type' => 'stock'],
            ['ticker' => 'CMCSA', 'name' => 'Comcast Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'VZ', 'name' => 'Verizon Communications Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'T', 'name' => 'AT&T Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'TMUS', 'name' => 'T-Mobile US, Inc.', 'asset_type' => 'stock'],

            // Financials
            ['ticker' => 'JPM', 'name' => 'JPMorgan Chase & Co.', 'asset_type' => 'stock'],
            ['ticker' => 'BAC', 'name' => 'Bank of America Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'WFC', 'name' => 'Wells Fargo & Company', 'asset_type' => 'stock'],
            ['ticker' => 'GS', 'name' => 'The Goldman Sachs Group, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'MS', 'name' => 'Morgan Stanley', 'asset_type' => 'stock'],
            ['ticker' => 'C', 'name' => 'Citigroup Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'BLK', 'name' => 'BlackRock, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'SCHW', 'name' => 'The Charles Schwab Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'AXP', 'name' => 'American Express Company', 'asset_type' => 'stock'],
            ['ticker' => 'V', 'name' => 'Visa Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'MA', 'name' => 'Mastercard Incorporated', 'asset_type' => 'stock'],
            ['ticker' => 'COF', 'name' => 'Capital One Financial Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'USB', 'name' => 'U.S. Bancorp', 'asset_type' => 'stock'],
            ['ticker' => 'PNC', 'name' => 'The PNC Financial Services Group, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'BRK.B', 'name' => 'Berkshire Hathaway Inc.', 'asset_type' => 'stock'],

            // Healthcare / pharma
            ['ticker' => 'JNJ', 'name' => 'Johnson & Johnson', 'asset_type' => 'stock'],
            ['ticker' => 'PFE', 'name' => 'Pfizer Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'MRK', 'name' => 'Merck & Co., Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'ABBV', 'name' => 'AbbVie Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'LLY', 'name' => 'Eli Lilly and Company', 'asset_type' => 'stock'],
            ['ticker' => 'BMY', 'name' => 'Bristol-Myers Squibb Company', 'asset_type' => 'stock'],
            ['ticker' => 'TMO', 'name' => 'Thermo Fisher Scientific Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'ABT', 'name' => 'Abbott Laboratories', 'asset_type' => 'stock'],
            ['ticker' => 'DHR', 'name' => 'Danaher Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'UNH', 'name' => 'UnitedHealth Group Incorporated', 'asset_type' => 'stock'],
            ['ticker' => 'CVS', 'name' => 'CVS Health Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'MDT', 'name' => 'Medtronic plc', 'asset_type' => 'stock'],
            ['ticker' => 'AMGN', 'name' => 'Amgen Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'GILD', 'name' => 'Gilead Sciences, Inc.', 'asset_type' => 'stock'],

            // Consumer / retail
            ['ticker' => 'WMT', 'name' => 'Walmart Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'COST', 'name' => 'Costco Wholesale Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'HD', 'name' => 'The Home Depot, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'LOW', 'name' => "Lowe's Companies, Inc.", 'asset_type' => 'stock'],
            ['ticker' => 'TGT', 'name' => 'Target Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'NKE', 'name' => 'NIKE, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'SBUX', 'name' => 'Starbucks Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'MCD', 'name' => "McDonald's Corporation", 'asset_type' => 'stock'],
            ['ticker' => 'KO', 'name' => 'The Coca-Cola Company', 'asset_type' => 'stock'],
            ['ticker' => 'PEP', 'name' => 'PepsiCo, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'PG', 'name' => 'The Procter & Gamble Company', 'asset_type' => 'stock'],
            ['ticker' => 'CL', 'name' => 'Colgate-Palmolive Company', 'asset_type' => 'stock'],
            ['ticker' => 'MDLZ', 'name' => 'Mondelez International, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'PM', 'name' => 'Philip Morris International Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'MO', 'name' => 'Altria Group, Inc.', 'asset_type' => 'stock'],

            // Energy / industrials / materials
            ['ticker' => 'XOM', 'name' => 'Exxon Mobil Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'CVX', 'name' => 'Chevron Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'COP', 'name' => 'ConocoPhillips', 'asset_type' => 'stock'],
            ['ticker' => 'SLB', 'name' => 'Schlumberger Limited', 'asset_type' => 'stock'],
            ['ticker' => 'OXY', 'name' => 'Occidental Petroleum Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'BA', 'name' => 'The Boeing Company', 'asset_type' => 'stock'],
            ['ticker' => 'CAT', 'name' => 'Caterpillar Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'GE', 'name' => 'General Electric Company', 'asset_type' => 'stock'],
            ['ticker' => 'HON', 'name' => 'Honeywell International Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'MMM', 'name' => '3M Company', 'asset_type' => 'stock'],
            ['ticker' => 'LMT', 'name' => 'Lockheed Martin Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'RTX', 'name' => 'RTX Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'UPS', 'name' => 'United Parcel Service, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'FDX', 'name' => 'FedEx Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'DE', 'name' => 'Deere & Company', 'asset_type' => 'stock'],

            // Auto / mobility
            ['ticker' => 'F', 'name' => 'Ford Motor Company', 'asset_type' => 'stock'],
            ['ticker' => 'GM', 'name' => 'General Motors Company', 'asset_type' => 'stock'],

            // Utilities / real estate / misc
            ['ticker' => 'NEE', 'name' => 'NextEra Energy, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'DUK', 'name' => 'Duke Energy Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'SO', 'name' => 'The Southern Company', 'asset_type' => 'stock'],
            ['ticker' => 'PLD', 'name' => 'Prologis, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'SPG', 'name' => 'Simon Property Group, Inc.', 'asset_type' => 'stock'],

            // Crypto majors
            ['ticker' => 'BTC', 'name' => 'Bitcoin', 'asset_type' => 'crypto'],
            ['ticker' => 'ETH', 'name' => 'Ethereum', 'asset_type' => 'crypto'],
            ['ticker' => 'SOL', 'name' => 'Solana', 'asset_type' => 'crypto'],
            ['ticker' => 'BNB', 'name' => 'BNB', 'asset_type' => 'crypto'],
            ['ticker' => 'XRP', 'name' => 'XRP', 'asset_type' => 'crypto'],
            ['ticker' => 'ADA', 'name' => 'Cardano', 'asset_type' => 'crypto'],
            ['ticker' => 'DOGE', 'name' => 'Dogecoin', 'asset_type' => 'crypto'],
            ['ticker' => 'AVAX', 'name' => 'Avalanche', 'asset_type' => 'crypto'],
            ['ticker' => 'LINK', 'name' => 'Chainlink', 'asset_type' => 'crypto'],
        ];

        foreach ($symbols as $symbol) {
            Symbol::updateOrCreate(
                ['ticker' => $symbol['ticker']],
                [
                    'name' => $symbol['name'],
                    'asset_type' => $symbol['asset_type'],
                    'is_active' => true,
                    'tradeable' => true,
                    'price_source' => $symbol['asset_type'] === 'stock' ? 'finnhub' : 'coinmarketcap',
                ],
            );
        }
    }
}
