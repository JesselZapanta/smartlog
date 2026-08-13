<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateCoordinatorRequest;
use App\Http\Resources\OjtCoordinator\CoordinatorResource;
use App\Models\Coordinator;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class CoordinatorController extends Controller
{
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => $user->coordinator ? new CoordinatorResource($user->coordinator) : null,
        ]);
    }

    public function update(UpdateCoordinatorRequest $request, User $user): JsonResponse
    {
        $coordinator = Coordinator::firstOrNew(['user_id' => $user->id]);
        $coordinator->fill($request->validated());
        $coordinator->save();

        return response()->json([
            'data' => new CoordinatorResource($coordinator),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->coordinator) {
            $user->coordinator->delete();
        }

        return response()->json([
            'data' => ['message' => 'Coordinator record deleted successfully.'],
        ]);
    }
}
