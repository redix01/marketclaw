<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Accounts\Actions\DepositFunds;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateDepositRequestStatusRequest;
use App\Models\DepositRequest;
use App\Models\LedgerEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class DepositRequestController extends Controller
{
    public function __construct(
        protected DepositFunds $depositFunds,
    ) {
    }

    public function index(): JsonResponse
    {
        $requests = DepositRequest::query()
            ->with(['user', 'paymentMethod', 'reviewer'])
            ->latest()
            ->get()
            ->map(fn (DepositRequest $request) => $this->transform($request));

        return response()->json(['data' => $requests]);
    }

    public function update(UpdateDepositRequestStatusRequest $request, DepositRequest $depositRequest): JsonResponse
    {
        $admin = $request->user();

        if ($depositRequest->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'Only pending deposit requests can be reviewed.',
            ]);
        }

        $depositRequest = DB::transaction(function () use ($request, $depositRequest, $admin): DepositRequest {
            $status = $request->validated('status');
            $account = $depositRequest->user->paperAccount()->firstOrFail();
            $creditedEntry = null;

            if ($status === 'approved') {
                $this->depositFunds->handle(
                    $account,
                    (float) $depositRequest->amount,
                    'Approved deposit request #'.$depositRequest->id,
                    'admin',
                    [
                        'editable' => false,
                        'deposit_request_id' => $depositRequest->id,
                    ],
                );

                $creditedEntry = LedgerEntry::query()
                    ->where('paper_account_id', $account->id)
                    ->where('type', 'deposit')
                    ->latest('id')
                    ->first();
            }

            $depositRequest->update([
                'status' => $status,
                'admin_notes' => $request->validated('admin_notes'),
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'credited_ledger_entry_id' => $creditedEntry?->id,
            ]);

            return $depositRequest->fresh(['user', 'paymentMethod', 'reviewer']);
        });

        return response()->json([
            'message' => 'Deposit request reviewed successfully.',
            'data' => $this->transform($depositRequest),
        ]);
    }

    public function destroy(DepositRequest $depositRequest): JsonResponse
    {
        if ($depositRequest->status === 'approved') {
            throw ValidationException::withMessages([
                'request' => 'Approved deposit requests cannot be deleted.',
            ]);
        }

        Storage::disk('local')->delete($depositRequest->proof_path);
        $depositRequest->delete();

        return response()->json([
            'message' => 'Deposit request deleted successfully.',
        ]);
    }

    protected function transform(DepositRequest $request): array
    {
        return [
            'id' => $request->id,
            'user_id' => $request->user_id,
            'user_name' => $request->user?->name,
            'user_email' => $request->user?->email,
            'payment_method_id' => $request->payment_method_id,
            'payment_method_name' => $request->wallet_name,
            'wallet_network' => $request->wallet_network,
            'wallet_address' => $request->wallet_address,
            'amount' => (float) $request->amount,
            'transaction_reference' => $request->transaction_reference,
            'notes' => $request->notes,
            'proof_original_name' => $request->proof_original_name,
            'status' => $request->status,
            'admin_notes' => $request->admin_notes,
            'reviewed_by' => $request->reviewer?->email,
            'reviewed_at' => optional($request->reviewed_at)->toISOString(),
            'created_at' => optional($request->created_at)->toISOString(),
        ];
    }
}
