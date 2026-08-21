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
        Schema::create('issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('intern_id')->constrained('interns')->cascadeOnDelete();
            $table->foreignId('hte_id')->constrained('htes')->cascadeOnDelete();
            $table->enum('type', ['intern', 'hte']);
            $table->text('issues');
            $table->text('solutions')->nullable();
            $table->text('recommendations')->nullable();
            $table->enum('status', ['pending', 'resolve'])->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('issues');
    }
};
