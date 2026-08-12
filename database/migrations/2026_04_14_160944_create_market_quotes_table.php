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
        Schema::create('market_quotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('symbol_id')->constrained()->cascadeOnDelete();
            $table->decimal('price', 20, 8);
            $table->decimal('change', 20, 8)->default(0);
            $table->decimal('change_percent', 10, 4)->default(0);
            $table->timestamp('quoted_at');
            $table->timestamps();

            $table->index(['symbol_id', 'quoted_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('market_quotes');
    }
};
