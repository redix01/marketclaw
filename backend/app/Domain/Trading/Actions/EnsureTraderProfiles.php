<?php

namespace App\Domain\Trading\Actions;

use App\Models\TraderProfile;
use App\Support\Trading\TraderProfileDefaults;
use Illuminate\Support\Collection;

class EnsureTraderProfiles
{
    public function handle(): Collection
    {
        foreach (TraderProfileDefaults::all() as $profile) {
            TraderProfile::query()->firstOrCreate(
                ['asset_type' => $profile['asset_type']],
                $profile,
            );
        }

        return TraderProfile::query()->orderBy('asset_type')->get();
    }
}
