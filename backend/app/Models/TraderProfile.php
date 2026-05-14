<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TraderProfile extends Model
{
    protected $fillable = [
        'asset_type',
        'title',
        'description',
        'commission_percent',
        'level',
    ];

    protected function casts(): array
    {
        return [
            'commission_percent' => 'float',
            'level' => 'integer',
        ];
    }
}
