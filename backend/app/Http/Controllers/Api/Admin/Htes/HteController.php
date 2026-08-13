<?php

namespace App\Http\Controllers\Api\Admin\Htes;

use App\Http\Controllers\Controller;
use App\Http\Resources\Hte\HteDetailResource;
use App\Http\Resources\Hte\HteListResource;
use App\Models\Hte;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HteController extends Controller
{
    /**
     * View-only list of HTE accounts with server-side search, filters, sorting and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Hte::with(['user', 'institute', 'program']);

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhereHas('user', function (Builder $userBuilder) use ($search): void {
                        $userBuilder->where('firstname', 'like', "%{$search}%")
                            ->orWhere('middlename', 'like', "%{$search}%")
                            ->orWhere('lastname', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $instituteId = $request->integer('institute_id');

        if ($instituteId > 0) {
            $query->where('institute_id', $instituteId);
        }

        $status = $request->string('status')->trim()->toString();

        if (in_array($status, ['active', 'expired', 'inactive'], true)) {
            $query->where('status', $status);
        }

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'status', 'created_at'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $htes = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => HteListResource::collection($htes),
            'meta' => [
                'current_page' => $htes->currentPage(),
                'last_page' => $htes->lastPage(),
                'per_page' => $htes->perPage(),
                'total' => $htes->total(),
                'from' => $htes->firstItem(),
                'to' => $htes->lastItem(),
            ],
        ]);
    }

    /**
     * View-only detail for a single HTE account.
     */
    public function show(User $user): JsonResponse
    {
        $hte = $user->hte;

        if (! $hte) {
            return response()->json([
                'data' => ['message' => 'This user has no HTE record.'],
            ], 404);
        }

        $hte->loadMissing(['user.location', 'program', 'institute']);

        return response()->json([
            'data' => new HteDetailResource($hte),
        ]);
    }
}
