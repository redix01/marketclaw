<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Requests\Api\V1\ResendEmailVerificationCodeRequest;
use App\Http\Requests\Api\V1\RegisterRequest;
use App\Http\Requests\Api\V1\VerifyEmailCodeRequest;
use App\Models\User;
use App\Services\EmailVerificationCodeService;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(
        RegisterRequest $request,
        EnsurePaperAccount $ensurePaperAccount,
        EmailVerificationCodeService $emailVerificationCodeService,
    ): JsonResponse
    {
        $user = User::query()->create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
            'status' => 'pending_verification',
        ]);

        $ensurePaperAccount->handle($user, 0.0);
        $emailVerificationCodeService->send($user);

        return response()->json([
            'message' => 'Account created. Enter the verification code sent to your email to continue.',
            'data' => [
                ...$emailVerificationCodeService->challengePayload($user),
                'user' => FrontendPayload::user($user->fresh()),
            ],
        ], 202);
    }

    public function login(
        LoginRequest $request,
        EnsurePaperAccount $ensurePaperAccount,
        EmailVerificationCodeService $emailVerificationCodeService,
    ): JsonResponse
    {
        $user = User::query()->where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status === 'disabled') {
            throw ValidationException::withMessages([
                'email' => ['This account is disabled. Contact support.'],
            ]);
        }

        if (! $user->email_verified_at && $user->status === 'pending_verification') {
            $ensurePaperAccount->handle($user, 0.0);
            $emailVerificationCodeService->send($user);

            return response()->json([
                'message' => 'Your email address is not verified yet. Enter the code sent to your email to continue.',
                'data' => $emailVerificationCodeService->challengePayload($user),
            ], 403);
        }

        return $this->authenticatedResponse($user, $ensurePaperAccount, 'Logged in successfully.');
    }

    public function verifyEmailCode(
        VerifyEmailCodeRequest $request,
        EnsurePaperAccount $ensurePaperAccount,
        EmailVerificationCodeService $emailVerificationCodeService,
    ): JsonResponse
    {
        $user = User::query()
            ->where('email', $request->validated('email'))
            ->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['We could not find an account for that email address.'],
            ]);
        }

        $emailVerificationCodeService->assertCanVerify($user, $request->validated('code'));

        $user->forceFill([
            'email_verified_at' => now(),
            'status' => $user->is_admin ? $user->status : 'active',
        ])->save();

        return $this->authenticatedResponse($user->fresh(), $ensurePaperAccount, 'Email verified successfully.');
    }

    public function resendVerificationCode(
        ResendEmailVerificationCodeRequest $request,
        EmailVerificationCodeService $emailVerificationCodeService,
    ): JsonResponse
    {
        $user = User::query()
            ->where('email', $request->validated('email'))
            ->first();

        if ($user && ! $user->email_verified_at && $user->status === 'pending_verification') {
            $emailVerificationCodeService->send($user);
        }

        return response()->json([
            'message' => 'If that account is awaiting verification, a fresh code has been sent.',
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

    private function authenticatedResponse(
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        string $message,
    ): JsonResponse {
        $account = $ensurePaperAccount->handle($user, 0.0);
        $user->loadMissing('preferences');
        $token = $user->createToken('web')->plainTextToken;

        return response()->json([
            'message' => $message,
            'data' => [
                'token' => $token,
                'user' => FrontendPayload::user($user),
                'account' => FrontendPayload::account($account),
                'preferences' => $user->preferences ? FrontendPayload::preference($user->preferences) : null,
            ],
        ]);
    }
}
