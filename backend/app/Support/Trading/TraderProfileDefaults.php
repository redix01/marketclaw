<?php

namespace App\Support\Trading;

class TraderProfileDefaults
{
    public static function all(): array
    {
        return [
            [
                'asset_type' => 'stock',
                'title' => 'Stock AI Trader',
                'description' => 'Tracks blue-chip and high-volatility equities; opens grid positions around technical levels.',
                'commission_percent' => 20.0,
                'level' => 1,
            ],
            [
                'asset_type' => 'crypto',
                'title' => 'Crypto AI Trader',
                'description' => '24/7 grid agent on top crypto pairs — fractional sizing, faster cycles, deeper exposure ranges.',
                'commission_percent' => 20.0,
                'level' => 1,
            ],
        ];
    }
}
