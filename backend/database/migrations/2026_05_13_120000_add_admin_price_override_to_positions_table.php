<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('positions', function (Blueprint $table): void {
            $table->decimal('admin_price_override', 20, 8)->nullable()->after('last_valued_at');
            $table->timestamp('admin_price_overridden_at')->nullable()->after('admin_price_override');
        });
    }

    public function down(): void
    {
        Schema::table('positions', function (Blueprint $table): void {
            $table->dropColumn(['admin_price_override', 'admin_price_overridden_at']);
        });
    }
};
