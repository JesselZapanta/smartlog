<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('firstname');
            $table->string('middlename')->nullable();
            $table->string('lastname');
            $table->string('extension')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('profile_picture')->nullable();
            $table->enum('role', ['admin', 'intern', 'ojt_instructor', 'ojt_coordinator', 'hte'])->default('intern')->index();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable()->index();
            $table->string('email_otp')->nullable();
            $table->timestamp('email_otp_expires_at')->nullable();
            $table->string('password_reset_otp')->nullable();
            $table->timestamp('password_reset_otp_expires_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
