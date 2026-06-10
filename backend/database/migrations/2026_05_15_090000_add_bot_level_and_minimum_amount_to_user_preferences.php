<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_preferences', function (Blueprint $table) {
            $table->unsignedSmallInteger('bot_level')->default(1)->after('commission_percent');
            $table->decimal('minimum_trading_amount', 10, 2)->default(0)->after('bot_level');
        });
    }

    public function down(): void
    {
        Schema::table('user_preferences', function (Blueprint $table) {
            $table->dropColumn(['bot_level', 'minimum_trading_amount']);
        });
    }
};
