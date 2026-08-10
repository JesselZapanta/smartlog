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
use Illuminate\Support\Facades\Route;

Route::get('/register/reference-data', [AuthController::class, 'referenceData'])->name('api.register.reference-data');
Route::post('/register', [AuthController::class, 'register'])->name('api.register');
Route::post('/login', [AuthController::class, 'login'])->name('api.login');

Route::middleware('auth:api')->group(function (): void {
    Route::get('/me', [AuthController::class, 'me'])->name('api.me');
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');

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

    Route::get('academic-terms/options', [AcademicTermController::class, 'options'])->name('api.academic-terms.options');

    Route::apiResource('academic-terms', AcademicTermController::class)
        ->except(['create', 'edit']);

    Route::apiResource('institutes', InstituteController::class)
        ->except(['create', 'edit']);

    Route::apiResource('programs', ProgramController::class)
        ->except(['create', 'edit']);
});
