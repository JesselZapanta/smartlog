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
        Schema::create('interns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->constrained('academic_terms')->cascadeOnDelete();
            $table->foreignId('institute_id')->constrained()->cascadeOnDelete();
            $table->foreignId('program_id')->constrained()->cascadeOnDelete();
            $table->date('date_of_birth')->nullable();
            $table->string('place_of_birth')->nullable();
            $table->string('fathers_name')->nullable();
            $table->string('fathers_occupation')->nullable();
            $table->string('fathers_contact')->nullable();
            $table->string('mothers_name')->nullable();
            $table->string('mothers_occupation')->nullable();
            $table->string('mothers_contact')->nullable();
            $table->string('parents_guardian_address')->nullable();
            $table->string('practicum_instructor')->nullable();
            $table->string('cor_path')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('interns');
    }
};
