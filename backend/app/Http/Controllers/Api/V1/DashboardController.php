<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Trading\Actions\AutoCloseProfitablePositions;
use App\Domain\Trading\Queries\BuildDashboardSnapshot;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MarketDataRefreshService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function show(
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        BuildDashboardSnapshot $buildDashboardSnapshot,
        MarketDataRefreshService $marketDataRefreshService,
        AutoCloseProfitablePositions $autoCloseProfitablePositions,
    ): JsonResponse {
        $marketDataRefreshService->refreshStaleQuotes(1);
        $account = $ensurePaperAccount->handle($user);

        $autoCloseProfitablePositions->handle($account, 2.0);

        return response()->json([
            'data' => $buildDashboardSnapshot->handle($account),
        ]);
    }
}
