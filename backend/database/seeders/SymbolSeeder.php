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
            ['ticker' => 'BTC', 'name' => 'Bitcoin', 'asset_type' => 'crypto'],
            ['ticker' => 'ETH', 'name' => 'Ethereum', 'asset_type' => 'crypto'],
            ['ticker' => 'SOL', 'name' => 'Solana', 'asset_type' => 'crypto'],
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
                    'price_source' => 'seed',
                ],
            );
        }
    }
}
