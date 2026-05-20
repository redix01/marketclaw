<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Trading\Actions\AutoCloseProfitablePositions;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;

class LedgerController extends Controller
{
    public function index(
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        AutoCloseProfitablePositions $autoCloseProfitablePositions,
    ): JsonResponse
    {
        $account = $ensurePaperAccount->handle($user);
        $autoCloseProfitablePositions->handle($account);
        $account->refresh();
        $entries = $account->ledgerEntries()
            ->latest()
            ->get()
            ->map(fn ($entry) => FrontendPayload::ledgerEntry($entry));

        return response()->json([
            'data' => $entries,
        ]);
    }
}
