<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_verification_codes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('email');
            $table->string('code_hash');
            $table->timestamp('expires_at');
            $table->timestamp('last_sent_at');
            $table->timestamps();

            $table->unique('user_id');
            $table->index(['email', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_verification_codes');
    }
};
