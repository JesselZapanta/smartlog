<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class HteResource extends JsonResource
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
            'user_id' => $this->user_id,
            'name' => $this->name,
            'institute_id' => $this->institute_id,
            'program_id' => $this->program_id,
            'moa' => $this->moa,
            'moa_url' => $this->moa && Storage::disk('public')->exists($this->moa)
                ? Storage::disk('public')->url($this->moa)
                : null,
            'start_at' => $this->start_at?->format('Y-m-d'),
            'end_at' => $this->end_at?->format('Y-m-d'),
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
