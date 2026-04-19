<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Artisan;
use App\Services\MarketDataRefreshService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('market:sync-live-quotes {--stale-minutes=5}', function (): int {
    $staleMinutes = max(1, (int) $this->option('stale-minutes'));
    $updated = app(MarketDataRefreshService::class)->refreshStaleQuotes($staleMinutes);

    $this->info(sprintf('Synced %d live quote(s) from market providers.', $updated));

    return 0;
})->purpose('Sync stale live quotes from market providers');

Schedule::command('market:sync-live-quotes --stale-minutes=1')
    ->everyMinute()
    ->withoutOverlapping();
