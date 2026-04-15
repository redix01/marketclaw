<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('paper_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('base_currency', 3)->default('USD');
            $table->decimal('cash_balance', 20, 4)->default(0);
            $table->decimal('total_deposits', 20, 4)->default(0);
            $table->decimal('total_withdrawals', 20, 4)->default(0);
            $table->string('status')->default('active');
            $table->timestamp('last_reset_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('paper_accounts');
    }
};
