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
        Schema::create('photo_dtrs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('intern_id')->constrained()->cascadeOnDelete();
            $table->date('dtr_date')->index();
            $table->time('am_in_time')->nullable();
            $table->string('am_in_photo')->nullable();
            $table->time('am_out_time')->nullable();
            $table->string('am_out_photo')->nullable();
            $table->time('pm_in_time')->nullable();
            $table->string('pm_in_photo')->nullable();
            $table->time('pm_out_time')->nullable();
            $table->string('pm_out_photo')->nullable();
            $table->enum('status', ['pending', 'verified', 'checked', 'disapproved'])->default('pending')->index();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('checked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('checked_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['intern_id', 'dtr_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('photo_dtrs');
    }
};
