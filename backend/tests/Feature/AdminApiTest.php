<?php

namespace Tests\Feature;

use App\Models\DepositRequest;
use App\Models\MarketQuote;
use App\Models\Order;
use App\Models\PaperAccount;
use App\Models\PaymentMethod;
use App\Models\Position;
use App\Models\Symbol;
use App\Models\TraderProfile;
use App\Models\TraderUpgradeRequest;
use App\Models\User;
use App\Models\UserPreference;
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

    public function test_admin_can_view_update_and_close_active_ai_trades(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        $symbol = Symbol::query()->create([
            'ticker' => 'AAPL',
            'name' => 'Apple Inc.',
            'asset_type' => 'stock',
            'is_active' => true,
            'tradeable' => true,
            'price_source' => 'finnhub',
        ]);
        $account = PaperAccount::query()->create([
            'user_id' => $user->id,
            'base_currency' => 'USD',
            'cash_balance' => 10000,
            'total_deposits' => 10000,
            'total_withdrawals' => 0,
            'status' => 'active',
        ]);
        UserPreference::query()->create([
            'user_id' => $user->id,
            'bot_running' => true,
            'bot_asset_type' => 'stock',
        ]);
        MarketQuote::query()->create([
            'symbol_id' => $symbol->id,
            'price' => 120,
            'change' => 0,
            'change_percent' => 0,
            'quoted_at' => now(),
        ]);
        $position = Position::query()->create([
            'paper_account_id' => $account->id,
            'symbol_id' => $symbol->id,
            'quantity' => 2,
            'average_entry_price' => 100,
            'market_value_snapshot' => 240,
            'last_valued_at' => now(),
        ]);
        Order::query()->create([
            'paper_account_id' => $account->id,
            'user_id' => $user->id,
            'symbol_id' => $symbol->id,
            'side' => 'buy',
            'order_type' => 'market',
            'quantity' => 2,
            'submitted_price' => 100,
            'fill_price' => 100,
            'status' => 'filled',
            'source' => 'bot',
            'submitted_at' => now()->subMinute(),
            'filled_at' => now()->subMinute(),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/trades')
            ->assertOk()
            ->assertJsonPath('data.0.id', $position->id)
            ->assertJsonPath('data.0.unrealized_pnl', 40);

        $this->patchJson('/api/v1/admin/trades/'.$position->id, [
            'unrealized_pnl' => 80,
        ])->assertOk()
            ->assertJsonPath('data.current_price', 140)
            ->assertJsonPath('data.unrealized_pnl', 80);

        $this->postJson('/api/v1/admin/trades/'.$position->id.'/close')
            ->assertOk();

        $this->assertDatabaseMissing('positions', [
            'id' => $position->id,
        ]);
        $this->assertDatabaseHas('orders', [
            'paper_account_id' => $account->id,
            'symbol_id' => $symbol->id,
            'side' => 'sell',
            'source' => 'bot',
            'fill_price' => 140,
        ]);
        $this->assertSame(10280.0, (float) $account->fresh()->cash_balance);
    }

    public function test_admin_can_manage_trader_profiles_and_upgrade_requests(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        $profile = TraderProfile::query()->create([
            'asset_type' => 'stock',
            'title' => 'Stock AI Trader',
            'description' => 'Initial description',
            'commission_percent' => 20,
            'level' => 1,
        ]);
        $upgradeRequest = TraderUpgradeRequest::query()->create([
            'user_id' => $user->id,
            'asset_type' => 'stock',
            'requested_level' => 2,
            'status' => 'pending',
            'note' => 'Need more throughput',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/trader-profiles')
            ->assertOk()
            ->assertJsonFragment(['asset_type' => 'stock']);

        $this->patchJson('/api/v1/admin/trader-profiles/'.$profile->id, [
            'commission_percent' => 12.5,
            'level' => 3,
            'description' => 'Updated description',
        ])->assertOk()
            ->assertJsonPath('data.commission_percent', 12.5)
            ->assertJsonPath('data.level', 3);

        $this->getJson('/api/v1/admin/trader-upgrade-requests')
            ->assertOk()
            ->assertJsonPath('data.0.id', $upgradeRequest->id);

        $this->patchJson('/api/v1/admin/trader-upgrade-requests/'.$upgradeRequest->id, [
            'status' => 'approved',
            'admin_notes' => 'Approved for next tier',
        ])->assertOk()
            ->assertJsonPath('data.status', 'approved');
    }
}
