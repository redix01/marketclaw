<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserPreference;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserBotSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $preferences = UserPreference::with('user:id,name,email')
            ->whereNotNull('bot_asset_type')
            ->orWhere('bot_level', '>', 1)
            ->orWhere('minimum_trading_amount', '>', 0)
            ->get();

        return response()->json([
            'data' => $preferences->map(function (UserPreference $pref) {
                return [
                    'id' => $pref->id,
                    'user_id' => $pref->user_id,
                    'user_name' => $pref->user?->name,
                    'user_email' => $pref->user?->email,
                    'bot_level' => $pref->bot_level,
                    'minimum_trading_amount' => $pref->minimum_trading_amount,
                    'bot_asset_type' => $pref->bot_asset_type,
                    'commission_percent' => $pref->commission_percent,
                ];
            })->values(),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'bot_level' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'minimum_trading_amount' => ['sometimes', 'numeric', 'min:0'],
            'commission_percent' => ['sometimes', 'numeric', 'min:0', 'max:100'],
        ]);

        $preferences = $user->preferences;
        if (!$preferences) {
            $preferences = UserPreference::create([
                'user_id' => $user->id,
                ...$validated,
            ]);
        } else {
            $preferences->update($validated);
        }

        return response()->json([
            'message' => 'User bot settings updated successfully.',
            'data' => [
                'id' => $preferences->id,
                'user_id' => $preferences->user_id,
                'bot_level' => $preferences->bot_level,
                'minimum_trading_amount' => $preferences->minimum_trading_amount,
                'commission_percent' => $preferences->commission_percent,
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        $preferences = $user->preferences;

        if (!$preferences) {
            return response()->json([
                'data' => [
                    'user_id' => $user->id,
                    'bot_level' => 1,
                    'minimum_trading_amount' => 0,
                    'commission_percent' => 20,
                ],
            ]);
        }

        return response()->json([
            'data' => [
                'id' => $preferences->id,
                'user_id' => $preferences->user_id,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'bot_level' => $preferences->bot_level,
                'minimum_trading_amount' => $preferences->minimum_trading_amount,
                'bot_asset_type' => $preferences->bot_asset_type,
                'commission_percent' => $preferences->commission_percent,
            ],
        ]);
    }
}
