<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Symbol extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticker',
        'name',
        'asset_type',
        'is_active',
        'tradeable',
        'price_source',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'tradeable' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function marketQuotes(): HasMany
    {
        return $this->hasMany(MarketQuote::class);
    }

    public function latestQuote(): HasOne
    {
        return $this->hasOne(MarketQuote::class)->latestOfMany('quoted_at');
    }

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
