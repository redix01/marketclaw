<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepositRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'payment_method_id',
        'amount',
        'wallet_name',
        'wallet_network',
        'wallet_address',
        'transaction_reference',
        'notes',
        'proof_path',
        'proof_original_name',
        'status',
        'admin_notes',
        'reviewed_by',
        'reviewed_at',
        'credited_ledger_entry_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function creditedLedgerEntry(): BelongsTo
    {
        return $this->belongsTo(LedgerEntry::class, 'credited_ledger_entry_id');
    }
}
