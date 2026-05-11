<?php

namespace Tests\Feature;

use App\Models\DepositRequest;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_access_admin_dashboard(): void
    {
        $user = User::factory()->create(['is_admin' => false]);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/admin/dashboard')
            ->assertForbidden();
    }

    public function test_admin_can_crud_payment_methods_and_transactions(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        Sanctum::actingAs($admin);

        $paymentMethodResponse = $this->postJson('/api/v1/admin/payment-methods', [
            'name' => 'Bitcoin',
            'network' => 'BTC',
            'address' => 'bc1-test',
            'instructions' => 'Use bitcoin only',
            'is_active' => true,
        ])->assertCreated();

        $paymentMethodId = $paymentMethodResponse->json('data.id');

        $this->patchJson('/api/v1/admin/payment-methods/'.$paymentMethodId, [
            'address' => 'bc1-updated',
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('data.address', 'bc1-updated')
            ->assertJsonPath('data.is_active', false);

        $transactionResponse = $this->postJson('/api/v1/admin/transactions', [
            'user_id' => $user->id,
            'type' => 'deposit',
            'amount' => 500,
            'description' => 'Admin funding',
        ])->assertCreated();

        $transactionId = $transactionResponse->json('data.id');
        $this->assertSame(10500.0, (float) $user->fresh()->paperAccount->cash_balance);

        $this->patchJson('/api/v1/admin/transactions/'.$transactionId, [
            'type' => 'withdrawal',
            'amount' => 250,
            'description' => 'Admin debit',
        ])->assertOk()
            ->assertJsonPath('data.type', 'withdrawal')
            ->assertJsonPath('data.amount', 250);

        $this->assertSame(9750.0, (float) $user->fresh()->paperAccount->cash_balance);

        $this->deleteJson('/api/v1/admin/transactions/'.$transactionId)
            ->assertOk();

        $this->assertSame(10000.0, (float) $user->fresh()->paperAccount->cash_balance);

        $this->deleteJson('/api/v1/admin/payment-methods/'.$paymentMethodId)
            ->assertOk();
    }

    public function test_admin_can_approve_deposit_requests_and_change_password(): void
    {
        Mail::fake();
        config()->set('services.admin_notification_email', 'admin@example.com');

        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        $method = PaymentMethod::query()->create([
            'name' => 'USDT',
            'network' => 'TRC20',
            'address' => 'T123',
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        $depositResponse = $this->post('/api/v1/users/'.$user->id.'/account/deposits', [
            'amount' => 1200,
            'payment_method_id' => $method->id,
            'proof_file' => UploadedFile::fake()->image('proof.png'),
        ])->assertCreated();

        $depositRequestId = $depositResponse->json('data.deposit_request_id');

        Sanctum::actingAs($admin);

        $this->patchJson('/api/v1/admin/deposit-requests/'.$depositRequestId, [
            'status' => 'approved',
            'admin_notes' => 'Verified on-chain',
        ])->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $user->refresh();
        $this->assertSame(11200.0, (float) $user->paperAccount->cash_balance);

        $this->patchJson('/api/v1/admin/settings/password', [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password', $admin->fresh()->password));
    }
}
