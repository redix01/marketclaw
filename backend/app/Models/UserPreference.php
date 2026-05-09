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
        'leverage',
        'take_profit_percent',
        'wallet_exposure_percent',
        'emergency_stop_percent',
        'max_open_positions',
        'auto_close_enabled',
        'bot_running',
        'bot_started_at',
        'bot_stopped_at',
        'bot_asset_type',
        'commission_percent',
    ];

    protected function casts(): array
    {
        return [
            'auto_fill_orders' => 'boolean',
            'simulate_slippage' => 'boolean',
            'notification_preferences' => 'array',
            'leverage' => 'integer',
            'take_profit_percent' => 'float',
            'wallet_exposure_percent' => 'integer',
            'emergency_stop_percent' => 'float',
            'max_open_positions' => 'integer',
            'auto_close_enabled' => 'boolean',
            'bot_running' => 'boolean',
            'bot_started_at' => 'datetime',
            'bot_stopped_at' => 'datetime',
            'commission_percent' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
