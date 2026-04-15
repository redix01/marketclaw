<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Trading\Queries\BuildDashboardSnapshot;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function show(
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        BuildDashboardSnapshot $buildDashboardSnapshot,
    ): JsonResponse {
        $account = $ensurePaperAccount->handle($user);

        return response()->json([
            'data' => $buildDashboardSnapshot->handle($account),
        ]);
    }
}
