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
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
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

        // New self-registered accounts start at $0.00. The user must fund
        // their wallet via the deposit flow before they can trade.
        $account = $ensurePaperAccount->handle($user, 0.0);
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

        // If the user somehow has no paper account yet, ensure one — but
        // create it empty so the user must explicitly deposit to receive
        // any starting balance.
        $account = $ensurePaperAccount->handle($user, 0.0);
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

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => 'Your password has been reset successfully.',
        ]);
    }
}
