<?php

namespace App\Http\Controllers\Api\Intern;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\Intern;
use App\Models\PhotoDtr;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Support\StorageUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $intern = $user->intern;

        if (! $intern) {
            return response()->json([
                'data' => [
                    'intern' => null,
                    'hte' => null,
                    'institute' => null,
                    'academic_year' => null,
                    'ojt_hours' => ['required' => 0, 'earned' => 0, 'remaining' => 0, 'progress' => 0],
                    'dtr' => ['total' => 0, 'by_status' => [], 'recent' => []],
                    'journals' => ['total' => 0, 'recent' => []],
                    'requirements' => ['total' => 0, 'by_status' => [], 'definitions_total' => 0, 'by_requirement' => []],
                ],
            ]);
        }

        $intern->loadMissing(['institute', 'program', 'academicYear', 'assignedHte.user']);

        $academicYearId = $request->integer('academic_year_id');
        $activeTerm = AcademicTerm::where('status', 'active')->first();
        $targetYearId = $academicYearId ?: ($intern->academic_year_id ?: ($activeTerm?->id));

        // OJT hours
        $requiredHours = $intern->requiredHours();
        $earnedMinutes = $intern->earnedMinutes();
        $earnedHours = (int) floor($earnedMinutes / 60);
        $remainingMinutes = max(0, ($requiredHours ?? 0) * 60 - $earnedMinutes);
        $remainingHours = (int) floor($remainingMinutes / 60);
        $hoursProgress = $requiredHours > 0 ? min(100, round(($earnedMinutes / ($requiredHours * 60)) * 100)) : 0;

        // DTR - scoped to this intern, optionally filtered by AY (if targetYearId differs from intern's AY, return empty)
        $dtrBase = PhotoDtr::where('intern_id', $intern->id);
        // If filtering by AY that doesn't match intern's AY, show empty (since DTR belongs to that intern's AY)
        $isAyMismatch = $targetYearId && $intern->academic_year_id && (int) $targetYearId !== (int) $intern->academic_year_id;
        if ($isAyMismatch) {
            $totalDtr = 0;
            $dtrByStatus = collect();
            $recentDtr = collect();
        } else {
            $totalDtr = (clone $dtrBase)->count();
            $dtrByStatus = (clone $dtrBase)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
            $recentDtr = (clone $dtrBase)->latest('dtr_date')->limit(5)->get()->map(fn (PhotoDtr $d): array => [
                'date' => $d->dtr_date,
                'am_in' => $d->am_in_time,
                'am_out' => $d->am_out_time,
                'pm_in' => $d->pm_in_time,
                'pm_out' => $d->pm_out_time,
                'status' => $d->status,
            ])->values();
        }

        // Journals
        $journalBase = DailyJournal::where('intern_id', $intern->id);
        if ($isAyMismatch) {
            $totalJournals = 0;
            $recentJournals = collect();
        } else {
            $totalJournals = (clone $journalBase)->count();
            $recentJournals = (clone $journalBase)->with('photos')->latest('date')->limit(5)->get()->map(fn (DailyJournal $j): array => [
                'date' => $j->date,
                'title' => $j->title,
                'journal' => $j->journal,
                'status' => $j->status,
                'photos' => $j->photos->map(fn ($p) => StorageUrl::url($p->photo))->filter()->values(),
            ])->values();
        }

        // Requirements - institute specific, AY aware
        $instituteId = $intern->institute_id;
        $requirementQuery = RequirementSubmission::where('user_id', $user->id);
        if ($isAyMismatch) {
            $totalRequirements = 0;
            $requirementsByStatus = collect();
        } else {
            $totalRequirements = (clone $requirementQuery)->count();
            $requirementsByStatus = (clone $requirementQuery)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        }
        $totalRequirementsDef = $instituteId ? Requirement::where('institute_id', $instituteId)->count() : 0;
        $requirementsByRequirement = collect();
        if ($instituteId && ! $isAyMismatch) {
            $requirementsByRequirement = Requirement::where('institute_id', $instituteId)->get()->map(function (Requirement $req) use ($user): array {
                $base = $req->submissions()->where('user_id', $user->id);
                $total = (clone $base)->count();

                return [
                    'name' => $req->name,
                    'type' => $req->type,
                    'is_active' => $req->is_active,
                    'total' => $total,
                    'approved' => (clone $base)->where('status', 'approved')->count(),
                    'pending' => (clone $base)->where('status', 'pending')->count(),
                    'rejected' => (clone $base)->where('status', 'rejected')->count(),
                ];
            })->values();
        }

        $hte = $intern->assignedHte;
        $academicYear = $targetYearId ? AcademicTerm::find($targetYearId) : $intern->academicYear;
        if (! $academicYear && $intern->academicYear) {
            $academicYear = $intern->academicYear;
        }

        return response()->json([
            'data' => [
                'intern' => [
                    'institute' => $intern->institute?->name,
                    'program' => $intern->program?->name,
                    'academic_year' => $intern->academicYear?->code,
                    'status' => $intern->status,
                    'ojt_status' => $intern->ojt_status,
                ],
                'hte' => $hte ? ['name' => $hte->name, 'status' => $hte->status] : null,
                'institute' => $intern->institute ? ['id' => $intern->institute->id, 'name' => $intern->institute->name] : null,
                'academic_year' => $academicYear ? $academicYear->only(['id', 'code', 'description']) : null,
                'ojt_hours' => [
                    'required' => $requiredHours ?? 0,
                    'earned' => $earnedHours,
                    'earned_minutes' => $earnedMinutes,
                    'remaining' => $remainingHours,
                    'progress' => $hoursProgress,
                ],
                'dtr' => [
                    'total' => $totalDtr,
                    'by_status' => $dtrByStatus->toArray(),
                    'recent' => $recentDtr,
                ],
                'journals' => [
                    'total' => $totalJournals,
                    'recent' => $recentJournals,
                ],
                'requirements' => [
                    'total' => $totalRequirements,
                    'by_status' => $requirementsByStatus->toArray(),
                    'definitions_total' => $totalRequirementsDef,
                    'by_requirement' => $requirementsByRequirement,
                ],
            ],
        ]);
    }
}
