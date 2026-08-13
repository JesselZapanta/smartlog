<?php

namespace App\Http\Resources\Hte;

use App\Http\Resources\LocationResource;
use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class HteDetailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->user->uuid,
            'name' => $this->name,
            'contact_person' => $this->user->full_name,
            'email' => $this->user->email,
            'contact_number' => $this->user->contact_number,
            'profile_picture' => $this->user->profile_picture,
            'institute' => $this->institute?->name,
            'program' => $this->program?->name,
            'moa' => $this->moa,
            'moa_url' => $this->moa && Storage::disk('public')->exists($this->moa)
                ? StorageUrl::url($this->moa)
                : null,
            'start_at' => $this->start_at?->format('Y-m-d'),
            'end_at' => $this->end_at?->format('Y-m-d'),
            'location' => $this->user->location ? new LocationResource($this->user->location) : null,
            'status' => $this->status,
            'created_at' => $this->created_at,
        ];
    }
}
