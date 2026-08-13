<?php

namespace App\Services;

use App\Mail\EmailVerificationCodeMail;
use App\Models\EmailVerificationCode;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class EmailVerificationCodeService
{
    private const EXPIRY_MINUTES = 15;

    public function send(User $user): void
    {
        $code = $this->issue($user);

        Mail::to($user->email)->send(new EmailVerificationCodeMail(
            user: $user,
            code: $code,
            expiresInMinutes: self::EXPIRY_MINUTES,
        ));
    }

    public function verify(User $user, string $code): bool
    {
        $verification = $user->emailVerificationCode;

        if (! $verification) {
            return false;
        }

        if ($verification->expires_at->isPast()) {
            $verification->delete();

            return false;
        }

        if (! Hash::check($code, $verification->code_hash)) {
            return false;
        }

        $verification->delete();

        return true;
    }

    public function challengePayload(User $user): array
    {
        $verification = $user->emailVerificationCode;
        $expiresAt = $verification?->expires_at;

        return [
            'verification_required' => true,
            'email' => $user->email,
            'expires_at' => $expiresAt?->toISOString(),
            'expires_in_seconds' => $expiresAt ? max(0, now()->diffInSeconds($expiresAt, false)) : (self::EXPIRY_MINUTES * 60),
        ];
    }

    public function purge(User $user): void
    {
        $user->emailVerificationCode()?->delete();
    }

    public function assertCanVerify(User $user, string $code): void
    {
        if (! $this->verify($user, $code)) {
            throw ValidationException::withMessages([
                'code' => ['The verification code is invalid or has expired.'],
            ]);
        }
    }

    private function issue(User $user): string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        EmailVerificationCode::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'email' => $user->email,
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes(self::EXPIRY_MINUTES),
                'last_sent_at' => now(),
            ],
        );

        return $code;
    }
}
