<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_preferences', function (Blueprint $table) {
            // 'stock' | 'crypto' — null means "either / unscoped".
            $table->string('bot_asset_type', 16)->nullable();
            // Cut applied to positive realized P&L on auto-closed bot trades,
            // expressed as a percent (e.g. 20.00). Stored per-user so we can
            // run promos / discounts later without changing logic.
            $table->decimal('commission_percent', 5, 2)->default(20.00);
        });
    }

    public function down(): void
    {
        Schema::table('user_preferences', function (Blueprint $table) {
            $table->dropColumn(['bot_asset_type', 'commission_percent']);
        });
    }
};
