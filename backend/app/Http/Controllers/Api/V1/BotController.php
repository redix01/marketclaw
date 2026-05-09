<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class BotController extends Controller
{
    public function start(Request $request, User $user, EnsurePaperAccount $ensurePaperAccount): JsonResponse
    {
        $validated = $request->validate([
            'asset_type' => ['sometimes', 'nullable', Rule::in(['stock', 'crypto'])],
        ]);

        $ensurePaperAccount->handle($user);
        $user->load('preferences');

        $preferences = $user->preferences;
        $update = [
            'bot_running' => true,
            'bot_started_at' => now(),
        ];
        if (array_key_exists('asset_type', $validated)) {
            $update['bot_asset_type'] = $validated['asset_type'];
        }
        $preferences->forceFill($update)->save();

        Log::info('BotController: started for user_id='.$user->id
            .' type='.($preferences->bot_asset_type ?? 'all')
            .' tp='.$preferences->take_profit_percent.'% stop='.$preferences->emergency_stop_percent.'%');

        return response()->json([
            'message' => 'Agent trader started.',
            'data' => [
                'preferences' => FrontendPayload::preference($preferences->fresh()),
            ],
        ]);
    }

    public function stop(User $user, EnsurePaperAccount $ensurePaperAccount): JsonResponse
    {
        $ensurePaperAccount->handle($user);
        $user->load('preferences');

        $preferences = $user->preferences;
        $preferences->forceFill([
            'bot_running' => false,
            'bot_stopped_at' => now(),
        ])->save();

        Log::info('BotController: stopped for user_id='.$user->id);

        return response()->json([
            'message' => 'Agent trader stopped.',
            'data' => [
                'preferences' => FrontendPayload::preference($preferences->fresh()),
            ],
        ]);
    }
}
