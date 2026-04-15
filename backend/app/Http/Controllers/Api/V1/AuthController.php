<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Requests\Api\V1\RegisterRequest;
use App\Models\User;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request, EnsurePaperAccount $ensurePaperAccount): JsonResponse
    {
        $user = User::query()->create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
            'status' => 'active',
        ]);

        $account = $ensurePaperAccount->handle($user);
        $user->loadMissing('preferences');
        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'message' => 'Account created successfully.',
            'data' => [
                'token' => $token,
                'user' => FrontendPayload::user($user),
                'account' => FrontendPayload::account($account),
                'preferences' => $user->preferences ? FrontendPayload::preference($user->preferences) : null,
            ],
        ], 201);
    }

    public function login(LoginRequest $request, EnsurePaperAccount $ensurePaperAccount): JsonResponse
    {
        $user = User::query()->where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $account = $ensurePaperAccount->handle($user);
        $user->loadMissing('preferences');
        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'message' => 'Logged in successfully.',
            'data' => [
                'token' => $token,
                'user' => FrontendPayload::user($user),
                'account' => FrontendPayload::account($account),
                'preferences' => $user->preferences ? FrontendPayload::preference($user->preferences) : null,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
