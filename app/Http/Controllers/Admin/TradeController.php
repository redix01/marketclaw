<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Trading\Actions\SubmitMarketOrder;
use App\Http\Controllers\Controller;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TradeController extends Controller
{
    public function index(): JsonResponse
    {
        $positions = Position::query()
            ->with(['paperAccount.user.preferences', 'symbol.latestQuote'])
            ->whereHas('paperAccount.orders', function ($query): void {
                $query->where('source', 'bot')
                    ->where('side', 'buy')
                    ->where('status', 'filled');
            })
            ->latest()
            ->get()
            ->map(fn (Position $position) => $this->transformPosition($position));

        return response()->json(['data' => $positions]);
    }

    public function update(Request $request, Position $position): JsonResponse
    {
        $this->assertBotTrade($position);

        $validated = $request->validate([
            'unrealized_pnl' => ['nullable', 'numeric'],
            'current_price' => ['nullable', 'numeric', 'gt:0'],
        ]);

        if (! array_key_exists('unrealized_pnl', $validated) && ! array_key_exists('current_price', $validated)) {
            throw ValidationException::withMessages([
                'trade' => 'Provide unrealized_pnl or current_price to update this trade.',
            ]);
        }

        $quantity = (float) $position->quantity;
        $entryPrice = (float) $position->average_entry_price;
        $overridePrice = array_key_exists('current_price', $validated)
            ? (float) $validated['current_price']
            : $entryPrice + (((float) $validated['unrealized_pnl']) / max($quantity, 0.00000001));

        if ($overridePrice <= 0) {
            throw ValidationException::withMessages([
                'current_price' => 'The resulting current price must be greater than zero.',
            ]);
        }

        $position->forceFill([
            'admin_price_override' => $overridePrice,
            'admin_price_overridden_at' => now(),
            'market_value_snapshot' => $overridePrice * $quantity,
            'last_valued_at' => now(),
        ])->save();

        $position->load(['paperAccount.user.preferences', 'symbol.latestQuote']);

        return response()->json([
            'message' => 'Trade updated successfully.',
            'data' => $this->transformPosition($position),
        ]);
    }

    public function close(Position $position, SubmitMarketOrder $submitMarketOrder): JsonResponse
    {
        $this->assertBotTrade($position);

        $position->loadMissing(['paperAccount', 'symbol']);

        $order = $submitMarketOrder->handle(
            $position->paperAccount,
            $position->symbol,
            'sell',
            (float) $position->quantity,
            $position->resolvedCurrentPrice(),
            'bot',
            null,
            true,
        );

        return response()->json([
            'message' => 'Trade closed successfully.',
            'data' => [
                'order_id' => $order->id,
            ],
        ]);
    }

    protected function transformPosition(Position $position): array
    {
        $currentPrice = $position->resolvedCurrentPrice();
        $quantity = (float) $position->quantity;
        $entryPrice = (float) $position->average_entry_price;
        $unrealizedPnl = ($currentPrice - $entryPrice) * $quantity;

        return [
            'id' => $position->id,
            'user_id' => $position->paperAccount->user_id,
            'user_name' => $position->paperAccount->user?->name,
            'user_email' => $position->paperAccount->user?->email,
            'symbol' => $position->symbol?->ticker,
            'symbol_name' => $position->symbol?->name,
            'asset_type' => $position->symbol?->asset_type,
            'quantity' => $quantity,
            'average_entry_price' => $entryPrice,
            'current_price' => $currentPrice,
            'market_value' => $currentPrice * $quantity,
            'unrealized_pnl' => $unrealizedPnl,
            'pnl_percent' => $entryPrice > 0 ? (($currentPrice - $entryPrice) / $entryPrice) * 100 : 0.0,
            'bot_running' => (bool) ($position->paperAccount->user?->preferences?->bot_running ?? false),
            'price_source' => $position->currentPriceSource(),
            'updated_at' => optional($position->updated_at)->toISOString(),
            'admin_price_overridden_at' => optional($position->admin_price_overridden_at)->toISOString(),
        ];
    }

    protected function assertBotTrade(Position $position): void
    {
        $isBotTrade = $position->paperAccount()
            ->whereHas('orders', function ($query) use ($position): void {
                $query->where('symbol_id', $position->symbol_id)
                    ->where('source', 'bot')
                    ->where('side', 'buy')
                    ->where('status', 'filled');
            })
            ->exists();

        if (! $isBotTrade) {
            throw ValidationException::withMessages([
                'trade' => 'This position is not an active AI trade.',
            ]);
        }
    }
}
