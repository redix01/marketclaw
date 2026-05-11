<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DepositRequest;
use App\Models\LedgerEntry;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => [
                'stats' => [
                    'users_count' => User::query()->count(),
                    'admins_count' => User::query()->where('is_admin', true)->count(),
                    'active_users_count' => User::query()->where('status', 'active')->count(),
                    'pending_deposit_requests_count' => DepositRequest::query()->where('status', 'pending')->count(),
                    'approved_deposit_requests_count' => DepositRequest::query()->where('status', 'approved')->count(),
                    'payment_methods_count' => PaymentMethod::query()->count(),
                    'active_payment_methods_count' => PaymentMethod::query()->where('is_active', true)->count(),
                    'deposit_transactions_total' => (float) LedgerEntry::query()->where('type', 'deposit')->sum('amount'),
                    'withdrawal_transactions_total' => (float) abs((float) LedgerEntry::query()->where('type', 'withdrawal')->sum('amount')),
                    'ai_trades_count' => Order::query()->where('source', 'bot')->count(),
                    'all_trades_count' => Order::query()->count(),
                ],
                'recent_deposit_requests' => DepositRequest::query()
                    ->with('user')
                    ->latest()
                    ->limit(5)
                    ->get()
                    ->map(fn (DepositRequest $request) => [
                        'id' => $request->id,
                        'user_name' => $request->user?->name,
                        'user_email' => $request->user?->email,
                        'amount' => (float) $request->amount,
                        'status' => $request->status,
                        'created_at' => optional($request->created_at)->toISOString(),
                    ]),
            ],
        ]);
    }
}
