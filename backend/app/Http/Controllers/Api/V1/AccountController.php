<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\DepositFunds;
use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Accounts\Actions\WithdrawFunds;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\DepositFundsRequest;
use App\Http\Requests\Api\V1\WithdrawFundsRequest;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;

class AccountController extends Controller
{
    public function show(User $user, EnsurePaperAccount $ensurePaperAccount): JsonResponse
    {
        $account = $ensurePaperAccount->handle($user)->load('user');

        return response()->json([
            'data' => FrontendPayload::account($account),
        ]);
    }

    public function deposit(
        DepositFundsRequest $request,
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        DepositFunds $depositFunds,
    ): JsonResponse {
        $account = $depositFunds->handle(
            $ensurePaperAccount->handle($user),
            (float) $request->validated('amount'),
            $request->validated('description') ?? 'Manual deposit',
        );

        return response()->json([
            'message' => 'Funds deposited successfully.',
            'data' => [
                'account' => FrontendPayload::account($account),
            ],
        ], 201);
    }

    public function withdraw(
        WithdrawFundsRequest $request,
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        WithdrawFunds $withdrawFunds,
    ): JsonResponse {
        $account = $withdrawFunds->handle(
            $ensurePaperAccount->handle($user),
            (float) $request->validated('amount'),
            $request->validated('description') ?? 'Manual withdrawal',
        );

        return response()->json([
            'message' => 'Funds withdrawn successfully.',
            'data' => [
                'account' => FrontendPayload::account($account),
            ],
        ]);
    }
}
