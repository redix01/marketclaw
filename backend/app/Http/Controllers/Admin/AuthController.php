<?php

namespace App\Http\Controllers\Admin;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminLoginRequest;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(AdminLoginRequest $request, EnsurePaperAccount $ensurePaperAccount): JsonResponse
    {
        $user = \App\Models\User::query()->where('email', $request->validated('email'))->first();

        if (! $user || ! $user->is_admin || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided admin credentials are incorrect.'],
            ]);
        }

        $account = $ensurePaperAccount->handle($user);
        $user->loadMissing('preferences');
        $token = $user->createToken('admin-web')->plainTextToken;

        return response()->json([
            'message' => 'Admin logged in successfully.',
            'data' => [
                'token' => $token,
                'user' => FrontendPayload::user($user),
                'account' => FrontendPayload::account($account),
                'preferences' => $user->preferences ? FrontendPayload::preference($user->preferences) : null,
            ],
        ]);
    }

    public function me(Request $request, EnsurePaperAccount $ensurePaperAccount): JsonResponse
    {
        $user = $request->user();
        $account = $ensurePaperAccount->handle($user);
        $user->loadMissing('preferences');

        return response()->json([
            'data' => [
                'user' => FrontendPayload::user($user),
                'account' => FrontendPayload::account($account),
                'preferences' => $user->preferences ? FrontendPayload::preference($user->preferences) : null,
            ],
        ]);
    }
}
