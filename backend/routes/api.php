<?php

use App\Http\Controllers\Api\Admin\AcademicTermController;
use App\Http\Controllers\Api\Admin\CoordinatorController;
use App\Http\Controllers\Api\Admin\HteController;
use App\Http\Controllers\Api\Admin\InstituteController;
use App\Http\Controllers\Api\Admin\InternController;
use App\Http\Controllers\Api\Admin\LocationController;
use App\Http\Controllers\Api\Admin\ProgramController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Coordinator\RegistrationApprovalController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/register/reference-data', [AuthController::class, 'referenceData'])->name('api.register.reference-data');
Route::post('/register', [AuthController::class, 'register'])->name('api.register');
Route::post('/login', [AuthController::class, 'login'])->name('api.login');
Route::post('/verify-email', [AuthController::class, 'verifyEmail'])
    ->middleware('throttle:10,1')
    ->name('api.verify-email');
Route::post('/verify-email/resend', [AuthController::class, 'resendVerification'])
    ->middleware('throttle:3,1')
    ->name('api.verify-email.resend');

Route::middleware('auth:api')->group(function (): void {
    Route::get('/me', [AuthController::class, 'me'])->name('api.me');
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');

    Route::get('/dashboard', [DashboardController::class, 'show'])->name('api.dashboard');

    Route::get('/notifications', [NotificationController::class, 'index'])->name('api.notifications');
    Route::put('/notifications/{notification}/read', [NotificationController::class, 'markRead'])->name('api.notifications.read');
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('api.notifications.read-all');

    Route::get('academic-terms/options', [AcademicTermController::class, 'options'])->name('api.academic-terms.options');

    Route::get('/profile', [ProfileController::class, 'show'])->name('api.profile');
    Route::put('/profile', [ProfileController::class, 'updateAccount'])->name('api.profile.update');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('api.profile.password.update');
    Route::put('/profile/location', [ProfileController::class, 'updateLocation'])->name('api.profile.location.update');
    Route::put('/profile/intern', [ProfileController::class, 'updateIntern'])
        ->middleware('role:intern')
        ->name('api.profile.intern.update');
    Route::put('/profile/hte', [ProfileController::class, 'updateHte'])
        ->middleware('role:hte')
        ->name('api.profile.hte.update');

    Route::middleware('role:intern')->group(function (): void {
        Route::get('/my-registration', [RegistrationApprovalController::class, 'myRegistration'])->name('api.my-registration');
        Route::post('/my-registration/resubmit', [RegistrationApprovalController::class, 'resubmit'])->name('api.my-registration.resubmit');
    });

    Route::middleware('role:ojt_coordinator')->group(function (): void {
        Route::get('/registrations/pending', [RegistrationApprovalController::class, 'pending'])->name('api.registrations.pending');
        Route::get('/registrations/{user:uuid}', [RegistrationApprovalController::class, 'show'])->name('api.registrations.show');
        Route::post('/registrations/{user:uuid}/approve', [RegistrationApprovalController::class, 'approve'])->name('api.registrations.approve');
        Route::post('/registrations/{user:uuid}/reject', [RegistrationApprovalController::class, 'reject'])->name('api.registrations.reject');
    });

    Route::middleware('role:admin')->group(function (): void {
        Route::apiResource('users', UserController::class)
            ->parameters(['users' => 'user:uuid'])
            ->except(['create', 'edit']);

        Route::get('users/{user:uuid}/location', [LocationController::class, 'show'])->name('api.users.location');
        Route::put('users/{user:uuid}/location', [LocationController::class, 'update'])->name('api.users.location.update');

        Route::get('users/{user:uuid}/intern', [InternController::class, 'show'])->name('api.users.intern');
        Route::put('users/{user:uuid}/intern', [InternController::class, 'update'])->name('api.users.intern.update');
        Route::delete('users/{user:uuid}/intern', [InternController::class, 'destroy'])->name('api.users.intern.destroy');

        Route::get('users/{user:uuid}/hte', [HteController::class, 'show'])->name('api.users.hte');
        Route::put('users/{user:uuid}/hte', [HteController::class, 'update'])->name('api.users.hte.update');
        Route::delete('users/{user:uuid}/hte', [HteController::class, 'destroy'])->name('api.users.hte.destroy');

        Route::get('users/{user:uuid}/coordinator', [CoordinatorController::class, 'show'])->name('api.users.coordinator');
        Route::put('users/{user:uuid}/coordinator', [CoordinatorController::class, 'update'])->name('api.users.coordinator.update');
        Route::delete('users/{user:uuid}/coordinator', [CoordinatorController::class, 'destroy'])->name('api.users.coordinator.destroy');

        Route::apiResource('academic-terms', AcademicTermController::class)
            ->except(['create', 'edit']);

        Route::apiResource('institutes', InstituteController::class)
            ->except(['create', 'edit']);

        Route::apiResource('programs', ProgramController::class)
            ->except(['create', 'edit']);
    });
});
