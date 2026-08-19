<?php

namespace App\Http\Controllers\Api\Intern;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OjtHoursController extends Controller
{
    /**
     * The authenticated intern's OJT hour requirement and earned hours.
     */
    public function show(Request $request): JsonResponse
    {
        $intern = $request->user()->intern;

        abort_unless($intern, 404, 'This user has no intern record.');

        return response()->json([
            'data' => [
                'institute' => $intern->institute?->name,
                'required_hours' => $intern->requiredHours(),
                'earned_minutes' => $intern->earnedMinutes(),
            ],
        ]);
    }
}
