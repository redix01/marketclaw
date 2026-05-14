<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Trading\Actions\EnsureTraderProfiles;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreTraderUpgradeRequest;
use App\Models\TraderUpgradeRequest;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class TraderUpgradeRequestController extends Controller
{
    public function store(
        StoreTraderUpgradeRequest $request,
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        EnsureTraderProfiles $ensureTraderProfiles,
    ): JsonResponse {
        $ensurePaperAccount->handle($user);
        $profiles = $ensureTraderProfiles->handle()->keyBy('asset_type');

        $assetType = $request->validated('asset_type');
        $requestedLevel = (int) $request->validated('requested_level');
        $profile = $profiles->get($assetType);
        $currentLevel = max(1, (int) ($profile?->level ?? 1));

        if ($requestedLevel <= $currentLevel) {
            throw ValidationException::withMessages([
                'requested_level' => 'Requested level must be higher than the current bot level.',
            ]);
        }

        $existingPending = TraderUpgradeRequest::query()
            ->where('user_id', $user->id)
            ->where('asset_type', $assetType)
            ->where('status', 'pending')
            ->exists();

        if ($existingPending) {
            throw ValidationException::withMessages([
                'asset_type' => 'You already have a pending upgrade request for this trader.',
            ]);
        }

        $upgradeRequest = TraderUpgradeRequest::query()->create([
            'user_id' => $user->id,
            'asset_type' => $assetType,
            'requested_level' => $requestedLevel,
            'status' => 'pending',
            'note' => $request->validated('note'),
        ]);

        return response()->json([
            'message' => 'Upgrade request submitted successfully.',
            'data' => FrontendPayload::traderUpgradeRequest($upgradeRequest),
        ], 201);
    }
}
