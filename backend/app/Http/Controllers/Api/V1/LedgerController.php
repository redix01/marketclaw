<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;

class LedgerController extends Controller
{
    public function index(User $user, EnsurePaperAccount $ensurePaperAccount): JsonResponse
    {
        $account = $ensurePaperAccount->handle($user);
        $entries = $account->ledgerEntries()
            ->latest()
            ->get()
            ->map(fn ($entry) => FrontendPayload::ledgerEntry($entry));

        return response()->json([
            'data' => $entries,
        ]);
    }
}
