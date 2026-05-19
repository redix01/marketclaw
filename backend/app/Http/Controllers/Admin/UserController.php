<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAdminUserRequest;
use App\Http\Requests\Admin\UpdateAdminUserRequest;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function __construct(
        protected EnsurePaperAccount $ensurePaperAccount,
    ) {
    }

    public function index(): JsonResponse
    {
        $users = User::query()
            ->with('paperAccount')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (User $user) {
                $account = $this->ensurePaperAccount->handle($user);

                return [
                    'user' => FrontendPayload::user($user),
                    'account' => FrontendPayload::account($account),
                ];
            });

        return response()->json(['data' => $users]);
    }

    public function store(StoreAdminUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = DB::transaction(function () use ($validated): User {
            $user = User::query()->create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'status' => $validated['status'] ?? 'active',
                'is_admin' => $validated['is_admin'] ?? false,
            ]);

            $account = $this->ensurePaperAccount->handle($user, (float) ($validated['initial_balance'] ?? 0));
            $user->setRelation('paperAccount', $account);

            return $user;
        });

        return response()->json([
            'message' => 'User created successfully.',
            'data' => [
                'user' => FrontendPayload::user($user),
                'account' => FrontendPayload::account($user->paperAccount),
            ],
        ], 201);
    }

    public function update(UpdateAdminUserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();

        $attributes = collect($validated)
            ->only(['name', 'email', 'status', 'is_admin'])
            ->toArray();

        if (! empty($validated['password'])) {
            $attributes['password'] = $validated['password'];
        }

        $user->update($attributes);
        $account = $this->ensurePaperAccount->handle($user);

        return response()->json([
            'message' => 'User updated successfully.',
            'data' => [
                'user' => FrontendPayload::user($user->fresh()),
                'account' => FrontendPayload::account($account),
            ],
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.',
        ]);
    }
}
