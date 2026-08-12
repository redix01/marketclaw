<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'paper_account_id',
        'user_id',
        'symbol_id',
        'agent_id',
        'side',
        'order_type',
        'quantity',
        'submitted_price',
        'fill_price',
        'status',
        'source',
        'submitted_at',
        'filled_at',
        'rejected_reason',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:8',
            'submitted_price' => 'decimal:8',
            'fill_price' => 'decimal:8',
            'submitted_at' => 'datetime',
            'filled_at' => 'datetime',
        ];
    }

    public function paperAccount(): BelongsTo
    {
        return $this->belongsTo(PaperAccount::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function symbol(): BelongsTo
    {
        return $this->belongsTo(Symbol::class);
    }
}
