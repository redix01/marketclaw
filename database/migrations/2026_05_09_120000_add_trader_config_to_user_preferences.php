<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_preferences', function (Blueprint $table) {
            $table->unsignedSmallInteger('leverage')->default(10);
            $table->decimal('take_profit_percent', 6, 2)->default(2.00);
            $table->unsignedSmallInteger('wallet_exposure_percent')->default(25);
            $table->decimal('emergency_stop_percent', 6, 2)->default(5.00);
            $table->unsignedSmallInteger('max_open_positions')->default(5);
            $table->boolean('auto_close_enabled')->default(true);
            $table->boolean('bot_running')->default(false);
            $table->timestamp('bot_started_at')->nullable();
            $table->timestamp('bot_stopped_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('user_preferences', function (Blueprint $table) {
            $table->dropColumn([
                'leverage',
                'take_profit_percent',
                'wallet_exposure_percent',
                'emergency_stop_percent',
                'max_open_positions',
                'auto_close_enabled',
                'bot_running',
                'bot_started_at',
                'bot_stopped_at',
            ]);
        });
    }
};
