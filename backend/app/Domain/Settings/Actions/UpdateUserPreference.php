<?php

namespace App\Domain\Settings\Actions;

use App\Models\User;
use App\Models\UserPreference;

class UpdateUserPreference
{
    public function handle(User $user, array $attributes): UserPreference
    {
        $preference = $user->preferences()->updateOrCreate(
            ['user_id' => $user->id],
            $attributes,
        );

        return $preference->fresh();
    }
}
