<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Trading\Actions\EnsureTraderProfiles;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateTraderProfileRequest;
use App\Models\TraderProfile;
use App\Models\TraderUpgradeRequest;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;

class TraderProfileController extends Controller
{
    public function index(EnsureTraderProfiles $ensureTraderProfiles): JsonResponse
    {
        $profiles = $ensureTraderProfiles->handle();

        return response()->json([
            'data' => $profiles->map(fn (TraderProfile $profile) => FrontendPayload::traderProfile($profile))->values(),
        ]);
    }

    public function update(UpdateTraderProfileRequest $request, TraderProfile $traderProfile): JsonResponse
    {
        $traderProfile->update($request->validated());

        return response()->json([
            'message' => 'Trader profile updated successfully.',
            'data' => FrontendPayload::traderProfile($traderProfile->fresh()),
        ]);
    }
}
