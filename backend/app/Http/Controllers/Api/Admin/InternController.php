<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateInternRequest;
use App\Http\Resources\Intern\InternResource;
use App\Models\Intern;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class InternController extends Controller
{
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => $user->intern ? new InternResource($user->intern) : null,
        ]);
    }

    public function update(UpdateInternRequest $request, User $user): JsonResponse
    {
        $intern = Intern::firstOrNew(['user_id' => $user->id]);

        if ($request->hasFile('cor')) {
            $oldPath = $intern->cor_path;
            $newPath = $request->file('cor')->store('cor', 'public');

            if ($oldPath && $oldPath !== $newPath) {
                Storage::disk('public')->delete($oldPath);
            }

            $intern->cor_path = $newPath;
        }

        $intern->fill($request->safe()->except(['cor']));
        $intern->save();

        return response()->json([
            'data' => new InternResource($intern),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->intern) {
            $user->intern->delete();
        }

        return response()->json([
            'data' => ['message' => 'Intern record deleted successfully.'],
        ]);
    }
}
