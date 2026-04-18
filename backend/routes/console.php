<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Artisan;
use App\Services\FinnhubMarketDataService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('market:sync-finnhub-quotes {--stale-minutes=5}', function (): int {
    $staleMinutes = max(1, (int) $this->option('stale-minutes'));
    $updated = app(FinnhubMarketDataService::class)->refreshStaleStockQuotes($staleMinutes);

    $this->info(sprintf('Synced %d stock quote(s) from Finnhub.', $updated));

    return 0;
})->purpose('Sync stale stock quotes from Finnhub');

Schedule::command('market:sync-finnhub-quotes --stale-minutes=1')
    ->everyMinute()
    ->withoutOverlapping();
