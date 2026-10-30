<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ojt_enrollment_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ojt_enrollment_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->string('type')->nullable();
            $table->string('file_path');
            $table->timestamps();

            $table->unique(
                ['ojt_enrollment_id', 'type'],
                'ojt_enrollment_documents_enrollment_type_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ojt_enrollment_documents');
    }
};
