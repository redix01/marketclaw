<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaperAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'base_currency',
        'cash_balance',
        'total_deposits',
        'total_withdrawals',
        'status',
        'last_reset_at',
    ];

    protected function casts(): array
    {
        return [
            'cash_balance' => 'decimal:4',
            'total_deposits' => 'decimal:4',
            'total_withdrawals' => 'decimal:4',
            'last_reset_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function positions(): HasMany
    {
        return $this->hasMany(Position::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(LedgerEntry::class);
    }
}
