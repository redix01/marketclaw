<?php

namespace App\Support\Api;

use App\Models\LedgerEntry;
use App\Models\Order;
use App\Models\PaperAccount;
use App\Models\Position;
use App\Models\User;
use App\Models\UserPreference;

class FrontendPayload
{
    public static function user(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar_url' => $user->avatar_url,
            'status' => $user->status,
            'is_admin' => $user->is_admin,
            'email_verified_at' => optional($user->email_verified_at)->toISOString(),
            'onboarding_completed_at' => optional($user->onboarding_completed_at)->toISOString(),
            'created_at' => optional($user->created_at)->toISOString(),
            'updated_at' => optional($user->updated_at)->toISOString(),
        ];
    }

    public static function account(PaperAccount $account): array
    {
        return [
            'id' => $account->id,
            'user_id' => $account->user_id,
            'base_currency' => $account->base_currency,
            'cash_balance' => (float) $account->cash_balance,
            'total_deposits' => (float) $account->total_deposits,
            'total_withdrawals' => (float) $account->total_withdrawals,
            'status' => $account->status,
            'last_reset_at' => optional($account->last_reset_at)->toISOString(),
            'created_at' => optional($account->created_at)->toISOString(),
            'updated_at' => optional($account->updated_at)->toISOString(),
        ];
    }

    public static function preference(UserPreference $preference): array
    {
        return [
            'id' => $preference->id,
            'user_id' => $preference->user_id,
            'auto_fill_orders' => $preference->auto_fill_orders,
            'simulate_slippage' => $preference->simulate_slippage,
            'default_max_allocation_percent' => $preference->default_max_allocation_percent,
            'default_approval_mode' => $preference->default_approval_mode,
            'notification_preferences' => $preference->notification_preferences ?? [],
            'leverage' => (int) ($preference->leverage ?? 10),
            'take_profit_percent' => (float) ($preference->take_profit_percent ?? 2.0),
            'wallet_exposure_percent' => (int) ($preference->wallet_exposure_percent ?? 25),
            'emergency_stop_percent' => (float) ($preference->emergency_stop_percent ?? 5.0),
            'max_open_positions' => (int) ($preference->max_open_positions ?? 5),
            'auto_close_enabled' => (bool) ($preference->auto_close_enabled ?? true),
            'bot_running' => (bool) ($preference->bot_running ?? false),
            'bot_started_at' => optional($preference->bot_started_at)->toISOString(),
            'bot_stopped_at' => optional($preference->bot_stopped_at)->toISOString(),
            'bot_asset_type' => $preference->bot_asset_type ?? null,
            'commission_percent' => (float) ($preference->commission_percent ?? 20.0),
            'created_at' => optional($preference->created_at)->toISOString(),
            'updated_at' => optional($preference->updated_at)->toISOString(),
        ];
    }

    public static function position(Position $position): array
    {
        $currentPrice = (float) optional($position->symbol->latestQuote)->price ?: (float) $position->average_entry_price;
        $quantity = (float) $position->quantity;
        $averageEntryPrice = (float) $position->average_entry_price;

        return [
            'id' => $position->id,
            'symbol_id' => $position->symbol_id,
            'symbol' => $position->symbol->ticker,
            'name' => $position->symbol->name,
            'asset_type' => $position->symbol->asset_type,
            'quantity' => $quantity,
            'average_entry_price' => $averageEntryPrice,
            'current_price' => $currentPrice,
            'market_value' => $quantity * $currentPrice,
            'unrealized_pl' => ($quantity * $currentPrice) - ($quantity * $averageEntryPrice),
            'updated_at' => optional($position->updated_at)->toISOString(),
        ];
    }

    public static function order(Order $order): array
    {
        return [
            'id' => $order->id,
            'symbol_id' => $order->symbol_id,
            'symbol' => $order->symbol->ticker,
            'side' => $order->side,
            'order_type' => $order->order_type,
            'quantity' => (float) $order->quantity,
            'submitted_price' => $order->submitted_price !== null ? (float) $order->submitted_price : null,
            'fill_price' => $order->fill_price !== null ? (float) $order->fill_price : null,
            'status' => $order->status,
            'source' => $order->source,
            'agent_id' => $order->agent_id,
            'submitted_at' => optional($order->submitted_at)->toISOString(),
            'filled_at' => optional($order->filled_at)->toISOString(),
            'created_at' => optional($order->created_at)->toISOString(),
            'updated_at' => optional($order->updated_at)->toISOString(),
        ];
    }

    public static function ledgerEntry(LedgerEntry $entry): array
    {
        return [
            'id' => $entry->id,
            'type' => $entry->type,
            'amount' => (float) $entry->amount,
            'description' => $entry->description,
            'reference_type' => $entry->reference_type,
            'reference_id' => $entry->reference_id,
            'meta' => $entry->meta ?? [],
            'created_at' => optional($entry->created_at)->toISOString(),
            'updated_at' => optional($entry->updated_at)->toISOString(),
        ];
    }
}
