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
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('paper_account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('symbol_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity', 20, 8);
            $table->decimal('average_entry_price', 20, 8);
            $table->decimal('market_value_snapshot', 20, 8)->nullable();
            $table->timestamp('last_valued_at')->nullable();
            $table->timestamps();

            $table->unique(['paper_account_id', 'symbol_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('positions');
    }
};
