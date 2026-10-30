<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transfer_requests', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('intern_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_year_id')->constrained('academic_terms')->cascadeOnDelete();
            $table->foreignId('from_hte_id')->nullable()->constrained('htes')->nullOnDelete();
            $table->foreignId('to_hte_id')->nullable()->constrained('htes')->nullOnDelete();
            $table->unsignedBigInteger('from_placement_id')->nullable();
            $table->unsignedBigInteger('to_placement_id')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reason')->nullable();
            $table->string('status')->default('requested');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamp('reassigned_at')->nullable();
            $table->foreignId('reassigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['intern_id', 'status']);
            $table->index('from_placement_id');
            $table->index('to_placement_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transfer_requests');
    }
};
