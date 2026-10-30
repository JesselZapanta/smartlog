<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateInternRequest;
use App\Http\Resources\Intern\InternResource;
use App\Models\AcademicTerm;
use App\Models\Intern;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternController extends Controller
{
    public function show(Request $request, User $user): JsonResponse
    {
        $intern = $user->enrollmentFor($request->integer('academic_year_id') ?: null);

        return response()->json([
            'data' => $intern ? new InternResource($intern) : null,
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        // Removing an intern removes every enrollment they hold, so a re-enrolled
        // intern loses their history too. This is deliberate: the admin's action
        // is "remove from the system", not "edit one term".
        $user->internEnrollments()->delete();

        return response()->json([
            'data' => ['message' => 'Intern deleted successfully.'],
        ]);
    }

    public function update(UpdateInternRequest $request, User $user): JsonResponse
    {
        // Not Intern::firstOrNew(['user_id' => ...]): with several enrollments
        // that matches an arbitrary term. Pin the term first, and only fall back
        // to creating a row when the user genuinely has none.
        $academicYearId = $request->integer('academic_year_id') ?: null;
        $intern = $user->enrollmentFor($academicYearId);

        if (! $intern) {
            $intern = new Intern(['user_id' => $user->id]);
            $intern->academic_year_id = $academicYearId
                ?? AcademicTerm::where('status', 'active')->latest('start_at')->value('id');
        }

        $intern->fill($request->safe());
        $intern->save();

        return response()->json([
            'data' => new InternResource($intern),
        ]);
    }
}
