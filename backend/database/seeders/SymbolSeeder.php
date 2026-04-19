<?php

namespace Database\Seeders;

use App\Models\Symbol;
use Illuminate\Database\Seeder;

class SymbolSeeder extends Seeder
{
    public function run(): void
    {
        $symbols = [
            ['ticker' => 'AAPL', 'name' => 'Apple Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'TSLA', 'name' => 'Tesla, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'NVDA', 'name' => 'NVIDIA Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'META', 'name' => 'Meta Platforms, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'NFLX', 'name' => 'Netflix, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'AMD', 'name' => 'Advanced Micro Devices, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'INTC', 'name' => 'Intel Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'ORCL', 'name' => 'Oracle Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'CRM', 'name' => 'Salesforce, Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'JPM', 'name' => 'JPMorgan Chase & Co.', 'asset_type' => 'stock'],
            ['ticker' => 'BAC', 'name' => 'Bank of America Corporation', 'asset_type' => 'stock'],
            ['ticker' => 'DIS', 'name' => 'The Walt Disney Company', 'asset_type' => 'stock'],
            ['ticker' => 'BTC', 'name' => 'Bitcoin', 'asset_type' => 'crypto'],
            ['ticker' => 'ETH', 'name' => 'Ethereum', 'asset_type' => 'crypto'],
            ['ticker' => 'SOL', 'name' => 'Solana', 'asset_type' => 'crypto'],
            ['ticker' => 'BNB', 'name' => 'BNB', 'asset_type' => 'crypto'],
            ['ticker' => 'XRP', 'name' => 'XRP', 'asset_type' => 'crypto'],
            ['ticker' => 'ADA', 'name' => 'Cardano', 'asset_type' => 'crypto'],
            ['ticker' => 'DOGE', 'name' => 'Dogecoin', 'asset_type' => 'crypto'],
            ['ticker' => 'AVAX', 'name' => 'Avalanche', 'asset_type' => 'crypto'],
            ['ticker' => 'LINK', 'name' => 'Chainlink', 'asset_type' => 'crypto'],
            ['ticker' => 'MSFT', 'name' => 'Microsoft Corp.', 'asset_type' => 'stock'],
            ['ticker' => 'GOOGL', 'name' => 'Alphabet Inc.', 'asset_type' => 'stock'],
            ['ticker' => 'AMZN', 'name' => 'Amazon.com Inc.', 'asset_type' => 'stock'],
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
