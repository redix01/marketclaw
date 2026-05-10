<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Accounts\Actions\WithdrawFunds;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\DepositFundsRequest;
use App\Http\Requests\Api\V1\WithdrawFundsRequest;
use App\Mail\DepositProofSubmitted;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

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
    ): JsonResponse {
        $account = $ensurePaperAccount->handle($user);
        $validated = $request->validated();
        $proofFile = $request->file('proof_file');
        $adminEmail = (string) config('services.admin_notification_email');

        Mail::to($adminEmail)->send(new DepositProofSubmitted(
            user: $user,
            amount: (float) $validated['amount'],
            walletName: $validated['wallet_name'],
            walletNetwork: $validated['wallet_network'],
            walletAddress: $validated['wallet_address'],
            transactionReference: $validated['transaction_reference'] ?? null,
            notes: $validated['notes'] ?? null,
            currentCashBalance: (float) $account->cash_balance,
            proofPath: $proofFile->getRealPath(),
            proofOriginalName: $proofFile->getClientOriginalName(),
            proofMimeType: $proofFile->getMimeType() ?: 'application/octet-stream',
        ));

        return response()->json([
            'message' => 'Deposit request submitted successfully. An admin has been notified by email.',
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
