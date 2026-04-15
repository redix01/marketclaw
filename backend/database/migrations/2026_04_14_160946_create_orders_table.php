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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('paper_account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('symbol_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('agent_id')->nullable();
            $table->string('side');
            $table->string('order_type')->default('market');
            $table->decimal('quantity', 20, 8);
            $table->decimal('submitted_price', 20, 8)->nullable();
            $table->decimal('fill_price', 20, 8)->nullable();
            $table->string('status')->default('pending');
            $table->string('source')->default('manual');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('filled_at')->nullable();
            $table->text('rejected_reason')->nullable();
            $table->timestamps();

            $table->index(['paper_account_id', 'status']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
