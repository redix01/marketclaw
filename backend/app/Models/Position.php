<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Position extends Model
{
    use HasFactory;

    protected $fillable = [
        'paper_account_id',
        'symbol_id',
        'quantity',
        'average_entry_price',
        'market_value_snapshot',
        'last_valued_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:8',
            'average_entry_price' => 'decimal:8',
            'market_value_snapshot' => 'decimal:8',
            'last_valued_at' => 'datetime',
        ];
    }

    public function paperAccount(): BelongsTo
    {
        return $this->belongsTo(PaperAccount::class);
    }

    public function symbol(): BelongsTo
    {
        return $this->belongsTo(Symbol::class);
    }
}
