<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Trading\Actions\AutoCloseProfitablePositions;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MarketDataRefreshService;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;

class PositionController extends Controller
{
    public function index(
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        MarketDataRefreshService $marketDataRefreshService,
        AutoCloseProfitablePositions $autoCloseProfitablePositions,
    ): JsonResponse
    {
        $marketDataRefreshService->refreshStaleQuotes(1);
        $account = $ensurePaperAccount->handle($user);

        $autoCloseProfitablePositions->handle($account, 2.0);

        $positions = $account->positions()
            ->with(['symbol.latestQuote'])
            ->get()
            ->map(fn ($position) => FrontendPayload::position($position));

        return response()->json([
            'data' => $positions,
        ]);
    }
}
