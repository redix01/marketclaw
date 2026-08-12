<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\UpdateProfileRequest;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;

class MeController extends Controller
{
    public function show(User $user, EnsurePaperAccount $ensurePaperAccount): JsonResponse
    {
        $account = $ensurePaperAccount->handle($user);
        $user->loadMissing('preferences');

        return response()->json([
            'data' => [
                'user' => FrontendPayload::user($user),
                'account' => FrontendPayload::account($account),
                'preferences' => $user->preferences ? FrontendPayload::preference($user->preferences) : null,
            ],
        ]);
    }

    public function update(UpdateProfileRequest $request, User $user): JsonResponse
    {
        $attributes = $request->safe()->only([
            'name',
            'avatar_url',
            'onboarding_completed_at',
        ]);

        $user->update($attributes);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'data' => [
                'user' => FrontendPayload::user($user->fresh()),
            ],
        ]);
    }
}
