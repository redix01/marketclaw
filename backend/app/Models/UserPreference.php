<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'auto_fill_orders',
        'simulate_slippage',
        'default_max_allocation_percent',
        'default_approval_mode',
        'notification_preferences',
    ];

    protected function casts(): array
    {
        return [
            'auto_fill_orders' => 'boolean',
            'simulate_slippage' => 'boolean',
            'notification_preferences' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
