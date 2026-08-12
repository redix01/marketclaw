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
        // Order by insertion (`id`) rather than market `quoted_at`. The
        // provider's `quoted_at` is the *trade* timestamp, which freezes at
        // the last close while the market is shut — meaning a freshly-fetched
        // after-hours quote could "lose" to a stale seeded row whose
        // `quoted_at` was set to `now()`. Ordering by the auto-increment
        // primary key guarantees the most recently *recorded* quote always
        // wins, which is the semantic the dashboard and bot want.
        return $this->hasOne(MarketQuote::class)->latestOfMany('id');
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
