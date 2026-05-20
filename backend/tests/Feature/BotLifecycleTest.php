<?php

namespace Tests\Feature;

use App\Models\MarketQuote;
use App\Models\PaperAccount;
use App\Models\Position;
use App\Models\Symbol;
use App\Models\TraderProfile;
use App\Models\TraderUpgradeRequest;
use App\Models\User;
use App\Models\UserPreference;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BotLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_fresh_start_seeds_new_bot_positions_and_resume_keeps_existing_session(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        TraderProfile::query()->create([
            'asset_type' => 'stock',
            'title' => 'Stock AI Trader',
            'description' => 'Stocks',
            'commission_percent' => 15,
            'level' => 2,
        ]);

        $symbols = collect([
            ['ticker' => 'AAPL', 'name' => 'Apple', 'price' => 100],
            ['ticker' => 'NVDA', 'name' => 'Nvidia', 'price' => 200],
            ['ticker' => 'MSFT', 'name' => 'Microsoft', 'price' => 300],
        ])->map(function (array $row) {
            $symbol = Symbol::query()->create([
                'ticker' => $row['ticker'],
                'name' => $row['name'],
                'asset_type' => 'stock',
                'is_active' => true,
                'tradeable' => true,
                'price_source' => 'finnhub',
            ]);
            MarketQuote::query()->create([
                'symbol_id' => $symbol->id,
                'price' => $row['price'],
                'change' => 1,
                'change_percent' => 2,
                'quoted_at' => now(),
            ]);

            return $symbol;
        });

        $freshResponse = $this->postJson('/api/v1/users/'.$user->id.'/bot/start', [
            'asset_type' => 'stock',
            'mode' => 'fresh',
        ])->assertOk();

        $this->assertSame('fresh', $freshResponse->json('data.session.mode'));
        $this->assertGreaterThan(0, $freshResponse->json('data.session.opened_positions_count'));
        $this->assertGreaterThan(0, $user->fresh()->paperAccount->positions()->count());
        $this->assertSame(15.0, (float) $user->fresh()->preferences->commission_percent);

        $startedAt = $freshResponse->json('data.preferences.bot_started_at');
        $buyOrdersCount = $user->fresh()->paperAccount->orders()->where('side', 'buy')->count();

        $this->postJson('/api/v1/users/'.$user->id.'/bot/stop')
            ->assertOk();

        $resumeResponse = $this->postJson('/api/v1/users/'.$user->id.'/bot/start', [
            'asset_type' => 'stock',
            'mode' => 'resume',
        ])->assertOk();

        $this->assertSame('resume', $resumeResponse->json('data.session.mode'));
        $this->assertSame($startedAt, $resumeResponse->json('data.preferences.bot_started_at'));
        $this->assertSame($buyOrdersCount, $user->fresh()->paperAccount->orders()->where('side', 'buy')->count());
    }

    public function test_user_can_request_trader_upgrade_once_per_asset_while_pending(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        TraderProfile::query()->create([
            'asset_type' => 'crypto',
            'title' => 'Crypto AI Trader',
            'description' => 'Crypto',
            'commission_percent' => 20,
            'level' => 1,
        ]);

        $this->postJson('/api/v1/users/'.$user->id.'/trader-upgrade-requests', [
            'asset_type' => 'crypto',
            'requested_level' => 2,
            'note' => 'Need faster execution',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $this->postJson('/api/v1/users/'.$user->id.'/trader-upgrade-requests', [
            'asset_type' => 'crypto',
            'requested_level' => 3,
        ])->assertStatus(422);

        $this->assertDatabaseHas('trader_upgrade_requests', [
            'user_id' => $user->id,
            'asset_type' => 'crypto',
            'requested_level' => 2,
        ]);
    }

    public function test_auto_close_respects_take_profit_flag_and_records_closed_trade_history(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $symbol = Symbol::query()->create([
            'ticker' => 'SPG',
            'name' => 'Simon Property Group',
            'asset_type' => 'stock',
            'is_active' => true,
            'tradeable' => true,
            'price_source' => 'finnhub',
        ]);

        MarketQuote::query()->create([
            'symbol_id' => $symbol->id,
            'price' => 103,
            'change' => 3,
            'change_percent' => 3,
            'quoted_at' => now(),
        ]);

        $account = PaperAccount::query()->create([
            'user_id' => $user->id,
            'base_currency' => 'USD',
            'cash_balance' => 0,
            'total_deposits' => 1000,
            'total_withdrawals' => 0,
            'status' => 'active',
        ]);

        Position::query()->create([
            'paper_account_id' => $account->id,
            'symbol_id' => $symbol->id,
            'quantity' => 10,
            'average_entry_price' => 100,
            'market_value_snapshot' => 1000,
            'last_valued_at' => now(),
        ]);

        UserPreference::query()->create([
            'user_id' => $user->id,
            'bot_running' => true,
            'bot_asset_type' => 'stock',
            'take_profit_percent' => 2,
            'emergency_stop_percent' => 5,
            'auto_close_enabled' => false,
            'commission_percent' => 20,
        ]);

        $this->getJson('/api/v1/users/'.$user->id.'/positions')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertDatabaseHas('positions', [
            'paper_account_id' => $account->id,
            'symbol_id' => $symbol->id,
        ]);

        MarketQuote::query()->where('symbol_id', $symbol->id)->update([
            'price' => 94,
            'change' => -6,
            'change_percent' => -6,
            'quoted_at' => now()->addMinute(),
        ]);

        $this->getJson('/api/v1/users/'.$user->id.'/positions')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $closedTradesResponse = $this->getJson('/api/v1/users/'.$user->id.'/closed-trades')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $closedTradesResponse
            ->assertJsonPath('summary.total_trades', 1)
            ->assertJsonPath('summary.auto_closed_count', 1)
            ->assertJsonPath('summary.bot_closed_count', 0)
            ->assertJsonPath('summary.manual_closed_count', 0)
            ->assertJsonPath('data.0.symbol', 'SPG')
            ->assertJsonPath('data.0.auto_closed', true)
            ->assertJsonPath('data.0.close_reason', 'stop_loss');

        $this->assertDatabaseMissing('positions', [
            'paper_account_id' => $account->id,
            'symbol_id' => $symbol->id,
        ]);

        $this->assertSame(940.0, (float) $account->fresh()->cash_balance);
    }
}
