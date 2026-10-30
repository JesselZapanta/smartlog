<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requirement_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('intern_id')->nullable()->constrained('interns')->cascadeOnDelete();
            $table->foreignId('placement_id')->nullable()->constrained('intern_hte_assignments')->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('requirement_id')->constrained()->restrictOnDelete();
            $table->string('file_path');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['placement_id', 'requirement_id'], 'requirement_submissions_placement_requirement_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requirement_submissions');
    }
};
