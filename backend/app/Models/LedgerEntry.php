<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class LedgerEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'paper_account_id',
        'user_id',
        'type',
        'amount',
        'description',
        'reference_type',
        'reference_id',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:8',
            'meta' => 'array',
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

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
