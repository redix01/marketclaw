<?php

namespace Tests\Feature;

use App\Mail\EmailVerificationCodeMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AuthVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_sends_email_verification_code_and_defers_dashboard_access(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'New Trader',
            'email' => 'new-trader@example.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
        ])->assertStatus(202);

        $response
            ->assertJsonPath('data.verification_required', true)
            ->assertJsonPath('data.email', 'new-trader@example.com')
            ->assertJsonPath('data.user.email', 'new-trader@example.com');

        $user = User::query()->where('email', 'new-trader@example.com')->firstOrFail();

        $this->assertNull($user->email_verified_at);
        $this->assertSame('pending_verification', $user->status);
        $this->assertNotNull($user->paperAccount);
        $this->assertSame(0.0, (float) $user->paperAccount->cash_balance);
        $this->assertNotNull($user->preferences);

        $this->assertDatabaseHas('email_verification_codes', [
            'user_id' => $user->id,
            'email' => 'new-trader@example.com',
        ]);

        Mail::assertSent(EmailVerificationCodeMail::class, function (EmailVerificationCodeMail $mail): bool {
            return $mail->hasTo('new-trader@example.com')
                && preg_match('/^\d{6}$/', $mail->code) === 1;
        });
    }

    public function test_user_can_verify_email_code_and_receive_session(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/register', [
            'name' => 'New Trader',
            'email' => 'verify-me@example.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
        ])->assertStatus(202);

        $verificationCode = null;

        Mail::assertSent(EmailVerificationCodeMail::class, function (EmailVerificationCodeMail $mail) use (&$verificationCode): bool {
            if (! $mail->hasTo('verify-me@example.com')) {
                return false;
            }

            $verificationCode = $mail->code;

            return true;
        });

        $this->assertNotNull($verificationCode);

        $response = $this->postJson('/api/v1/auth/verify-email-code', [
            'email' => 'verify-me@example.com',
            'code' => $verificationCode,
        ])->assertOk();

        $response
            ->assertJsonPath('data.user.email', 'verify-me@example.com')
            ->assertJsonPath('data.user.status', 'active');

        $user = User::query()->where('email', 'verify-me@example.com')->firstOrFail()->fresh();

        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('active', $user->status);
        $this->assertDatabaseMissing('email_verification_codes', [
            'user_id' => $user->id,
        ]);
        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_login_for_pending_verification_user_returns_challenge_and_resends_code(): void
    {
        Mail::fake();

        $user = User::factory()->unverified()->create([
            'email' => 'pending@example.com',
            'password' => Hash::make('secret1234'),
            'status' => 'pending_verification',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'pending@example.com',
            'password' => 'secret1234',
        ])->assertStatus(403)
            ->assertJsonPath('data.verification_required', true)
            ->assertJsonPath('data.email', 'pending@example.com');

        $this->assertNotNull($user->fresh()->paperAccount);
        $this->assertNotNull($user->fresh()->preferences);

        Mail::assertSent(EmailVerificationCodeMail::class, function (EmailVerificationCodeMail $mail): bool {
            return $mail->hasTo('pending@example.com');
        });
    }
}
