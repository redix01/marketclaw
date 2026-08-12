<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketQuote extends Model
{
    use HasFactory;

    protected $fillable = [
        'symbol_id',
        'price',
        'change',
        'change_percent',
        'quoted_at',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:8',
            'change' => 'decimal:8',
            'change_percent' => 'decimal:4',
            'quoted_at' => 'datetime',
        ];
    }

    public function symbol(): BelongsTo
    {
        return $this->belongsTo(Symbol::class);
    }
}
