<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hte_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('intern_id')->constrained()->cascadeOnDelete();
            $table->foreignId('placement_id')->nullable()->constrained('intern_hte_assignments')->nullOnDelete();
            $table->foreignId('hte_id')->constrained('htes')->cascadeOnDelete();
            $table->foreignId('criterion_id')->constrained('evaluation_criteria')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating')->nullable()->comment('1-5 scale (5=Always, 4=Very Often, 3=Often, 2=Sometimes, 1=Never)');
            $table->boolean('is_na')->default(false);
            $table->timestamps();

            $table->unique(['placement_id', 'criterion_id'], 'hte_evaluations_placement_criterion_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hte_evaluations');
    }
};
