<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intern_hte_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('intern_id')->constrained()->cascadeOnDelete();
            $table->foreignId('hte_id')->constrained('htes')->cascadeOnDelete();
            $table->foreignId('academic_year_id')->constrained('academic_terms')->cascadeOnDelete();
            $table->foreignId('transfer_request_id')->nullable()->constrained('transfer_requests')->nullOnDelete();
            $table->timestamp('assigned_at');
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('unassigned_at')->nullable();
            $table->foreignId('unassigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('deployed_at')->nullable();
            $table->timestamp('requirements_customized_at')->nullable();
            $table->timestamps();

            $table->index(['intern_id', 'unassigned_at']);
            $table->index(['hte_id', 'unassigned_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intern_hte_assignments');
    }
};
