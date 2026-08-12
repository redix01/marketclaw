<?php

namespace Tests\Feature;

use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DepositRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_submit_deposit_proof_without_crediting_balance(): void
    {
        Mail::fake();

        config()->set('services.admin_notification_email', 'admin@example.com');

        $user = User::factory()->create();
        $paymentMethod = PaymentMethod::query()->create([
            'name' => 'USDT',
            'network' => 'TRC20',
            'address' => 'TExampleWalletAddress',
            'is_active' => true,
        ]);
        Sanctum::actingAs($user);

        $response = $this->post('/api/v1/users/'.$user->id.'/account/deposits', [
            'amount' => 2500,
            'payment_method_id' => $paymentMethod->id,
            'transaction_reference' => 'TX-12345',
            'notes' => 'Paid from mobile wallet',
            'proof_file' => UploadedFile::fake()->image('proof.png'),
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Deposit request submitted successfully. An admin has been notified by email.')
            ->assertJsonPath('data.account.cash_balance', 10000)
            ->assertJsonPath('data.account.total_deposits', 10000);

        Mail::assertSent(\App\Mail\DepositProofSubmitted::class, function ($mail): bool {
            return $mail->hasTo('admin@example.com')
                && $mail->amount === 2500.0
                && $mail->walletName === 'USDT'
                && $mail->walletNetwork === 'TRC20';
        });
    }
}
