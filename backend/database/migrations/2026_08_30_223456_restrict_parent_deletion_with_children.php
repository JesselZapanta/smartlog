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
        Schema::table('programs', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->restrictOnDelete();
        });

        Schema::table('requirements', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->restrictOnDelete();
        });

        Schema::table('ojt_hours', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->restrictOnDelete();
        });

        Schema::table('interns', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->restrictOnDelete();

            $table->dropForeign(['program_id']);
            $table->foreign('program_id')->references('id')->on('programs')->restrictOnDelete();

            $table->dropForeign(['academic_year_id']);
            $table->foreign('academic_year_id')->references('id')->on('academic_terms')->restrictOnDelete();
        });

        Schema::table('htes', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->restrictOnDelete();

            $table->dropForeign(['program_id']);
            $table->foreign('program_id')->references('id')->on('programs')->restrictOnDelete();
        });

        Schema::table('coordinators', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->restrictOnDelete();

            $table->dropForeign(['program_id']);
            $table->foreign('program_id')->references('id')->on('programs')->restrictOnDelete();
        });

        Schema::table('evaluation_criteria', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->restrictOnDelete();
        });

        Schema::table('requirement_submissions', function (Blueprint $table): void {
            $table->dropForeign(['requirement_id']);
            $table->foreign('requirement_id')->references('id')->on('requirements')->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('requirement_submissions', function (Blueprint $table): void {
            $table->dropForeign(['requirement_id']);
            $table->foreign('requirement_id')->references('id')->on('requirements')->cascadeOnDelete();
        });

        Schema::table('evaluation_criteria', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->cascadeOnDelete();
        });

        Schema::table('coordinators', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->cascadeOnDelete();

            $table->dropForeign(['program_id']);
            $table->foreign('program_id')->references('id')->on('programs')->cascadeOnDelete();
        });

        Schema::table('htes', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->cascadeOnDelete();

            $table->dropForeign(['program_id']);
            $table->foreign('program_id')->references('id')->on('programs')->cascadeOnDelete();
        });

        Schema::table('interns', function (Blueprint $table): void {
            $table->dropForeign(['academic_year_id']);
            $table->foreign('academic_year_id')->references('id')->on('academic_terms')->cascadeOnDelete();

            $table->dropForeign(['program_id']);
            $table->foreign('program_id')->references('id')->on('programs')->cascadeOnDelete();

            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->cascadeOnDelete();
        });

        Schema::table('ojt_hours', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->cascadeOnDelete();
        });

        Schema::table('requirements', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->cascadeOnDelete();
        });

        Schema::table('programs', function (Blueprint $table): void {
            $table->dropForeign(['institute_id']);
            $table->foreign('institute_id')->references('id')->on('institutes')->cascadeOnDelete();
        });
    }
};
