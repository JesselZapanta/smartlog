<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateLocationRequest;
use App\Http\Resources\LocationResource;
use App\Models\Location;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class LocationController extends Controller
{
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => $user->location ? new LocationResource($user->location) : null,
        ]);
    }

    public function update(UpdateLocationRequest $request, User $user): JsonResponse
    {
        $location = Location::firstOrNew(['user_id' => $user->id]);
        $location->fill($request->validated());
        $location->save();

        return response()->json([
            'data' => new LocationResource($location),
        ]);
    }
}
