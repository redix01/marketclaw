<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Trading\Actions\EnsureTraderProfiles;
use App\Http\Controllers\Controller;
use App\Models\TraderUpgradeRequest;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;

class TraderProfileController extends Controller
{
    public function index(
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        EnsureTraderProfiles $ensureTraderProfiles,
    ): JsonResponse {
        $ensurePaperAccount->handle($user);

        $profiles = $ensureTraderProfiles->handle();
        $pendingRequests = TraderUpgradeRequest::query()
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->get()
            ->keyBy('asset_type');

        return response()->json([
            'data' => $profiles->map(
                fn ($profile) => FrontendPayload::traderProfile($profile, $pendingRequests->get($profile->asset_type))
            )->values(),
        ]);
    }
}
