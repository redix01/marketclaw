<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Trading\Actions\EnsureTraderProfiles;
use App\Domain\Trading\Actions\SeedBotPositions;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class BotController extends Controller
{
    public function start(
        Request $request,
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        EnsureTraderProfiles $ensureTraderProfiles,
        SeedBotPositions $seedBotPositions,
    ): JsonResponse
    {
        $validated = $request->validate([
            'asset_type' => ['sometimes', 'nullable', Rule::in(['stock', 'crypto'])],
            'mode' => ['sometimes', Rule::in(['fresh', 'resume'])],
        ]);

        $account = $ensurePaperAccount->handle($user);
        $user->load('preferences');
        $profiles = $ensureTraderProfiles->handle()->keyBy('asset_type');

        $preferences = $user->preferences;
        $assetType = $validated['asset_type'] ?? $preferences->bot_asset_type ?? 'stock';
        $mode = $validated['mode'] ?? 'fresh';
        $profile = $profiles->get($assetType);

        // Check minimum trading amount
        $minimumAmount = $preferences->minimum_trading_amount ?? 0;
        if ($minimumAmount > 0 && $account->cash_balance < $minimumAmount) {
            return response()->json([
                'message' => "Insufficient balance. Minimum trading amount for {$assetType} bot is \${$minimumAmount}.",
            ], 422);
        }

        $hadOpenPositions = $account->positions()
            ->whereHas('symbol', fn ($query) => $query->where('asset_type', $assetType))
            ->exists();

        $closedCount = 0;
        $opened = ['opened' => 0, 'symbols' => []];
        $startedAt = now();

        if ($mode === 'resume' && $hadOpenPositions && $preferences->bot_started_at) {
            $startedAt = $preferences->bot_started_at;
        } else {
            $closedCount = $seedBotPositions->closeExistingPositions($account, $assetType);
            $opened = $seedBotPositions->openFreshPositions($account->fresh(), $preferences, $assetType);
        }

        $update = [
            'bot_running' => true,
            'bot_started_at' => $startedAt,
            'bot_stopped_at' => null,
            'bot_asset_type' => $assetType,
        ];
        if ($profile) {
            $update['commission_percent'] = (float) $profile->commission_percent;
        }
        $preferences->forceFill($update)->save();

        Log::info('BotController: started for user_id='.$user->id
            .' type='.$assetType
            .' mode='.$mode
            .' opened='.$opened['opened']
            .' closed='.$closedCount
            .' tp='.$preferences->take_profit_percent.'% stop='.$preferences->emergency_stop_percent.'%');

        return response()->json([
            'message' => 'Agent trader started.',
            'data' => [
                'preferences' => FrontendPayload::preference($preferences->fresh()),
                'session' => [
                    'mode' => $mode === 'resume' && $hadOpenPositions ? 'resume' : 'fresh',
                    'opened_positions_count' => $opened['opened'],
                    'closed_positions_count' => $closedCount,
                    'opened_symbols' => $opened['symbols'],
                ],
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
