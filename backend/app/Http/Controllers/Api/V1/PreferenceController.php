<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Settings\Actions\UpdateUserPreference;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdatePreferenceRequest;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;

class PreferenceController extends Controller
{
    public function show(User $user, EnsurePaperAccount $ensurePaperAccount): JsonResponse
    {
        $ensurePaperAccount->handle($user);
        $user->load('preferences');

        return response()->json([
            'data' => [
                'preferences' => FrontendPayload::preference($user->preferences),
            ],
        ]);
    }

    public function update(
        UpdatePreferenceRequest $request,
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        UpdateUserPreference $updateUserPreference,
    ): JsonResponse {
        $ensurePaperAccount->handle($user);
        $preferences = $updateUserPreference->handle($user, $request->validated());

        return response()->json([
            'message' => 'Preferences updated successfully.',
            'data' => [
                'preferences' => FrontendPayload::preference($preferences),
            ],
        ]);
    }
}
