<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('placement_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('intern_hte_assignment_id')->constrained('intern_hte_assignments')->cascadeOnDelete();
            $table->foreignId('requirement_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['intern_hte_assignment_id', 'requirement_id'], 'placement_requirement_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placement_requirements');
    }
};
