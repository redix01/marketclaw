<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Trading\Actions\AutoCloseProfitablePositions;
use App\Domain\Trading\Actions\SubmitMarketOrder;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SubmitOrderRequest;
use App\Models\Symbol;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    public function index(
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        AutoCloseProfitablePositions $autoCloseProfitablePositions,
    ): JsonResponse
    {
        $account = $ensurePaperAccount->handle($user);
        $autoCloseProfitablePositions->handle($account);
        $account->refresh();
        $orders = $account->orders()
            ->with('symbol')
            ->latest()
            ->get()
            ->map(fn ($order) => FrontendPayload::order($order));

        return response()->json([
            'data' => $orders,
        ]);
    }

    public function store(
        SubmitOrderRequest $request,
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        SubmitMarketOrder $submitMarketOrder,
    ): JsonResponse {
        $account = $ensurePaperAccount->handle($user);
        $symbol = Symbol::query()->findOrFail($request->validated('symbol_id'));

        $order = $submitMarketOrder->handle(
            $account,
            $symbol,
            $request->validated('side'),
            (float) $request->validated('quantity'),
            $request->validated('submitted_price') !== null ? (float) $request->validated('submitted_price') : null,
            $request->validated('source') ?? 'manual',
            $request->validated('agent_id'),
        );

        return response()->json([
            'message' => 'Order submitted successfully.',
            'data' => [
                'order' => FrontendPayload::order($order),
            ],
        ], 201);
    }
}
