<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateHteRequest;
use App\Http\Resources\Hte\HteResource;
use App\Models\Hte;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class HteController extends Controller
{
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => $user->hte ? new HteResource($user->hte) : null,
        ]);
    }

    public function update(UpdateHteRequest $request, User $user): JsonResponse
    {
        $hte = Hte::firstOrNew(['user_id' => $user->id]);
        $data = $request->validated();

        if ($request->hasFile('moa')) {
            if ($hte->moa) {
                Storage::disk('public')->delete($hte->moa);
            }
            $data['moa'] = $request->file('moa')->store('moa', 'public');
        }

        $hte->fill($data);
        $hte->save();

        return response()->json([
            'data' => new HteResource($hte),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->hte) {
            $user->hte->delete();
        }

        return response()->json([
            'data' => ['message' => 'HTE record deleted successfully.'],
        ]);
    }
}
