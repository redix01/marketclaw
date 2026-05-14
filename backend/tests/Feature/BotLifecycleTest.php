<?php

namespace Tests\Feature;

use App\Models\MarketQuote;
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
}
