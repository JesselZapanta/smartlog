<?php

use App\Http\Controllers\Api\Admin\AcademicTermController;
use App\Http\Controllers\Api\Admin\CoordinatorController;
use App\Http\Controllers\Api\Admin\HteController;
use App\Http\Controllers\Api\Admin\Htes\HteController as HtesHteController;
use App\Http\Controllers\Api\Admin\InstituteController;
use App\Http\Controllers\Api\Admin\InternController;
use App\Http\Controllers\Api\Admin\Interns\InternController as InternsInternController;
use App\Http\Controllers\Api\Admin\LocationController;
use App\Http\Controllers\Api\Admin\OjtHourController;
use App\Http\Controllers\Api\Admin\ProgramController;
use App\Http\Controllers\Api\Admin\RequirementController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\Hte\EvaluationController as HteEvaluationController;
use App\Http\Controllers\Api\Hte\InternController as HteInternController;
use App\Http\Controllers\Api\Hte\InternMonitoringController as HteInternMonitoringController;
use App\Http\Controllers\Api\Intern\DailyJournalController;
use App\Http\Controllers\Api\Intern\EvaluationController as InternEvaluationController;
use App\Http\Controllers\Api\Intern\OjtHoursController;
use App\Http\Controllers\Api\Intern\PhotoDtrController;
use App\Http\Controllers\Api\Intern\RequirementController as InternRequirementController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OjtCoordinator\Evaluations\EvaluationCriterionController as CoordinatorEvaluationCriterionController;
use App\Http\Controllers\Api\OjtCoordinator\Htes\HteController as CoordinatorHteController;
use App\Http\Controllers\Api\OjtCoordinator\Interns\InternController as CoordinatorInternController;
use App\Http\Controllers\Api\OjtCoordinator\RegistrationApprovalController;
use App\Http\Controllers\Api\OjtCoordinator\Requirements\InternRequirementController as CoordinatorInternRequirementController;
use App\Http\Controllers\Api\OjtCoordinator\Requirements\RequirementController as CoordinatorRequirementController;
use App\Http\Controllers\Api\OjtInstructor\InternController as InstructorInternController;
use App\Http\Controllers\Api\OjtInstructor\InternMonitoringController as InstructorInternMonitoringController;
use App\Http\Controllers\Api\ProfileController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Broadcast::routes(['middleware' => ['auth:api']]);

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

        Route::get('/intern/requirements', [InternRequirementController::class, 'index'])->name('api.intern.requirements.index');
        Route::post('/intern/requirements/{requirement}/submit', [InternRequirementController::class, 'submit'])->name('api.intern.requirements.submit');
        Route::delete('/intern/requirements/{requirement}', [InternRequirementController::class, 'destroy'])->name('api.intern.requirements.destroy');

        Route::get('/intern/photo-dtr', [PhotoDtrController::class, 'index'])->name('api.intern.photo-dtr.index');
        Route::post('/intern/photo-dtr/punch', [PhotoDtrController::class, 'punch'])->name('api.intern.photo-dtr.punch');

        Route::get('/intern/ojt-hours', [OjtHoursController::class, 'show'])->name('api.intern.ojt-hours.show');

        Route::get('/intern/evaluations', [InternEvaluationController::class, 'show'])->name('api.intern.evaluations.show');
        Route::post('/intern/evaluations', [InternEvaluationController::class, 'store'])->name('api.intern.evaluations.store');

        Route::get('/intern/journals', [DailyJournalController::class, 'index'])->name('api.intern.journals.index');
        Route::post('/intern/journals', [DailyJournalController::class, 'store'])->name('api.intern.journals.store');
        Route::get('/intern/journals/{journal}', [DailyJournalController::class, 'show'])->name('api.intern.journals.show');
        Route::post('/intern/journals/{journal}', [DailyJournalController::class, 'update'])->name('api.intern.journals.update');
        Route::delete('/intern/journals/{journal}', [DailyJournalController::class, 'destroy'])->name('api.intern.journals.destroy');
    });

    Route::middleware('role:ojt_coordinator')->group(function (): void {
        Route::get('/registrations/pending', [RegistrationApprovalController::class, 'pending'])->name('api.registrations.pending');
        Route::get('/registrations/interns', [CoordinatorInternController::class, 'index'])->name('api.registrations.interns');
        Route::get('/registrations/interns/{user:uuid}', [CoordinatorInternController::class, 'show'])->name('api.registrations.interns.show');
        Route::get('/registrations/{user:uuid}', [RegistrationApprovalController::class, 'show'])->name('api.registrations.show');
        Route::post('/registrations/{user:uuid}/approve', [RegistrationApprovalController::class, 'approve'])->name('api.registrations.approve');
        Route::post('/registrations/{user:uuid}/reject', [RegistrationApprovalController::class, 'reject'])->name('api.registrations.reject');

        Route::get('/coordinator/htes/reference', [CoordinatorHteController::class, 'reference'])->name('api.coordinator.htes.reference');
        Route::get('/coordinator/htes', [CoordinatorHteController::class, 'index'])->name('api.coordinator.htes.index');
        Route::post('/coordinator/htes', [CoordinatorHteController::class, 'store'])->name('api.coordinator.htes.store');
        Route::get('/coordinator/htes/{user:uuid}', [CoordinatorHteController::class, 'show'])->name('api.coordinator.htes.show');
        Route::put('/coordinator/htes/{user:uuid}', [CoordinatorHteController::class, 'update'])->name('api.coordinator.htes.update');
        Route::delete('/coordinator/htes/{user:uuid}', [CoordinatorHteController::class, 'destroy'])->name('api.coordinator.htes.destroy');
        Route::get('/coordinator/htes/{user:uuid}/assignable-interns', [CoordinatorHteController::class, 'assignableInterns'])->name('api.coordinator.htes.assignable-interns');
        Route::get('/coordinator/htes/{user:uuid}/assigned-interns', [CoordinatorHteController::class, 'assignedInterns'])->name('api.coordinator.htes.assigned-interns');
        Route::post('/coordinator/htes/{user:uuid}/assign', [CoordinatorHteController::class, 'assign'])->name('api.coordinator.htes.assign');
        Route::post('/coordinator/htes/{user:uuid}/unassign', [CoordinatorHteController::class, 'unassign'])->name('api.coordinator.htes.unassign');

        Route::get('/coordinator/requirements', [CoordinatorRequirementController::class, 'index'])->name('api.coordinator.requirements.index');
        Route::post('/coordinator/requirements', [CoordinatorRequirementController::class, 'store'])->name('api.coordinator.requirements.store');
        Route::get('/coordinator/requirements/{requirement}', [CoordinatorRequirementController::class, 'show'])->name('api.coordinator.requirements.show');
        Route::put('/coordinator/requirements/{requirement}', [CoordinatorRequirementController::class, 'update'])->name('api.coordinator.requirements.update');
        Route::delete('/coordinator/requirements/{requirement}', [CoordinatorRequirementController::class, 'destroy'])->name('api.coordinator.requirements.destroy');

        Route::get('/coordinator/intern-requirements', [CoordinatorInternRequirementController::class, 'interns'])->name('api.coordinator.intern-requirements.interns');
        Route::get('/coordinator/intern-requirements/{user:uuid}', [CoordinatorInternRequirementController::class, 'show'])->name('api.coordinator.intern-requirements.show');
        Route::post('/coordinator/intern-requirements/{user:uuid}/approve-all', [CoordinatorInternRequirementController::class, 'approveAll'])->name('api.coordinator.intern-requirements.approve-all');
        Route::post('/coordinator/intern-requirements/{user:uuid}/reject-all', [CoordinatorInternRequirementController::class, 'rejectAll'])->name('api.coordinator.intern-requirements.reject-all');
        Route::post('/coordinator/intern-requirements/{user:uuid}/{requirement}/approve', [CoordinatorInternRequirementController::class, 'approve'])->name('api.coordinator.intern-requirements.approve');
        Route::post('/coordinator/intern-requirements/{user:uuid}/{requirement}/reject', [CoordinatorInternRequirementController::class, 'reject'])->name('api.coordinator.intern-requirements.reject');
        Route::post('/coordinator/intern-requirements/{user:uuid}/deploy', [CoordinatorInternRequirementController::class, 'deploy'])->name('api.coordinator.intern-requirements.deploy');
        Route::post('/coordinator/intern-requirements/{user:uuid}/mark-completed', [CoordinatorInternRequirementController::class, 'markCompleted'])->name('api.coordinator.intern-requirements.mark-completed');

        Route::apiResource('coordinator/evaluations', CoordinatorEvaluationCriterionController::class)
            ->except(['create', 'edit']);
    });

    Route::middleware('role:hte')->group(function (): void {
        Route::get('/hte/interns', [HteInternController::class, 'index'])->name('api.hte.interns.index');
        Route::get('/hte/interns/{user:uuid}', [HteInternController::class, 'show'])->name('api.hte.interns.show');
        Route::post('/hte/interns/{user:uuid}/complete', [HteInternController::class, 'completeHours'])->name('api.hte.interns.complete');
        Route::get('/hte/interns/{user:uuid}/monitoring', [HteInternMonitoringController::class, 'index'])->name('api.hte.interns.monitoring');
        Route::post('/hte/interns/{user:uuid}/monitoring/verify', [HteInternMonitoringController::class, 'verify'])->name('api.hte.interns.monitoring.verify');
        Route::post('/hte/interns/{user:uuid}/monitoring/flag', [HteInternMonitoringController::class, 'flag'])->name('api.hte.interns.monitoring.flag');

        Route::get('/hte/evaluations', [HteEvaluationController::class, 'index'])->name('api.hte.evaluations.index');
        Route::get('/hte/evaluations/{user:uuid}', [HteEvaluationController::class, 'show'])->name('api.hte.evaluations.show');
        Route::post('/hte/evaluations/{user:uuid}', [HteEvaluationController::class, 'store'])->name('api.hte.evaluations.store');
    });

    Route::middleware('role:ojt_instructor')->group(function (): void {
        Route::get('/instructor/interns', [InstructorInternController::class, 'index'])->name('api.instructor.interns.index');
        Route::get('/instructor/interns/{user:uuid}', [InstructorInternController::class, 'show'])->name('api.instructor.interns.show');
        Route::get('/instructor/interns/{user:uuid}/monitoring', [InstructorInternMonitoringController::class, 'index'])->name('api.instructor.interns.monitoring');
        Route::post('/instructor/interns/{user:uuid}/monitoring/approve', [InstructorInternMonitoringController::class, 'approve'])->name('api.instructor.interns.monitoring.approve');
        Route::post('/instructor/interns/{user:uuid}/monitoring/reject', [InstructorInternMonitoringController::class, 'reject'])->name('api.instructor.interns.monitoring.reject');
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

        Route::get('interns', [InternsInternController::class, 'index'])->name('api.interns.index');
        Route::get('interns/{user:uuid}', [InternsInternController::class, 'show'])->name('api.interns.show');

        Route::get('htes', [HtesHteController::class, 'index'])->name('api.htes.index');
        Route::get('htes/{user:uuid}', [HtesHteController::class, 'show'])->name('api.htes.show');

        Route::apiResource('academic-terms', AcademicTermController::class)
            ->except(['create', 'edit']);

        Route::apiResource('institutes', InstituteController::class)
            ->except(['create', 'edit']);

        Route::apiResource('programs', ProgramController::class)
            ->except(['create', 'edit']);

        Route::apiResource('requirements', RequirementController::class)
            ->except(['create', 'edit']);

        Route::apiResource('ojt-hours', OjtHourController::class)
            ->except(['create', 'edit']);
    });
});
