<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdminTransactionRequest;
use App\Http\Requests\Admin\UpdateAdminTransactionRequest;
use App\Models\LedgerEntry;
use App\Models\User;
use App\Services\Admin\AdminLedgerTransactionService;
use Illuminate\Http\JsonResponse;

class TransactionController extends Controller
{
    public function __construct(
        protected AdminLedgerTransactionService $service,
    ) {
    }

    public function index(): JsonResponse
    {
        $entries = LedgerEntry::query()
            ->with(['user', 'paperAccount'])
            ->whereIn('type', ['deposit', 'withdrawal'])
            ->latest()
            ->get()
            ->map(fn (LedgerEntry $entry) => $this->transform($entry));

        return response()->json(['data' => $entries]);
    }

    public function store(StoreAdminTransactionRequest $request): JsonResponse
    {
        $user = User::query()->findOrFail($request->validated('user_id'));
        $entry = $this->service->create(
            $user,
            $request->validated('type'),
            (float) $request->validated('amount'),
            $request->validated('description'),
        );

        return response()->json([
            'message' => 'Transaction created successfully.',
            'data' => $this->transform($entry->fresh(['user', 'paperAccount'])),
        ], 201);
    }

    public function update(UpdateAdminTransactionRequest $request, LedgerEntry $transaction): JsonResponse
    {
        $entry = $this->service->update(
            $transaction,
            $request->validated('type') ?? $transaction->type,
            (float) ($request->validated('amount') ?? abs((float) $transaction->amount)),
            $request->validated('description') ?? $transaction->description,
        );

        return response()->json([
            'message' => 'Transaction updated successfully.',
            'data' => $this->transform($entry),
        ]);
    }

    public function destroy(LedgerEntry $transaction): JsonResponse
    {
        $this->service->delete($transaction);

        return response()->json([
            'message' => 'Transaction deleted successfully.',
        ]);
    }

    protected function transform(LedgerEntry $entry): array
    {
        return [
            'id' => $entry->id,
            'user_id' => $entry->user_id,
            'user_name' => $entry->user?->name,
            'user_email' => $entry->user?->email,
            'type' => $entry->type,
            'amount' => abs((float) $entry->amount),
            'signed_amount' => (float) $entry->amount,
            'description' => $entry->description,
            'cash_balance' => $entry->paperAccount ? (float) $entry->paperAccount->cash_balance : null,
            'source' => data_get($entry->meta, 'source'),
            'editable' => (bool) data_get($entry->meta, 'editable', false),
            'created_at' => optional($entry->created_at)->toISOString(),
            'updated_at' => optional($entry->updated_at)->toISOString(),
        ];
    }
}
