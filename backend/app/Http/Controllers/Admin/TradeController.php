<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;

class TradeController extends Controller
{
    public function index(): JsonResponse
    {
        $orders = Order::query()
            ->with(['user', 'symbol'])
            ->where('source', 'bot')
            ->latest()
            ->get()
            ->map(fn (Order $order) => [
                'id' => $order->id,
                'user_id' => $order->user_id,
                'user_name' => $order->user?->name,
                'user_email' => $order->user?->email,
                'symbol' => $order->symbol?->ticker,
                'symbol_name' => $order->symbol?->name,
                'side' => $order->side,
                'quantity' => (float) $order->quantity,
                'submitted_price' => $order->submitted_price !== null ? (float) $order->submitted_price : null,
                'fill_price' => $order->fill_price !== null ? (float) $order->fill_price : null,
                'status' => $order->status,
                'agent_id' => $order->agent_id,
                'submitted_at' => optional($order->submitted_at)->toISOString(),
                'filled_at' => optional($order->filled_at)->toISOString(),
                'created_at' => optional($order->created_at)->toISOString(),
            ]);

        return response()->json(['data' => $orders]);
    }
}
