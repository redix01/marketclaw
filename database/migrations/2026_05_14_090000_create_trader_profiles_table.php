<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trader_profiles', function (Blueprint $table): void {
            $table->id();
            $table->string('asset_type', 16)->unique();
            $table->string('title');
            $table->text('description');
            $table->decimal('commission_percent', 5, 2)->default(20.00);
            $table->unsignedSmallInteger('level')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trader_profiles');
    }
};
