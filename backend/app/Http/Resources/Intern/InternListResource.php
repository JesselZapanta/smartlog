<?php

namespace App\Http\Resources\Intern;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InternListResource extends JsonResource
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
            'full_name' => $this->user->full_name,
            'email' => $this->user->email,
            'contact_number' => $this->user->contact_number,
            'profile_picture' => $this->user->profile_picture,
            'institute' => $this->institute?->name,
            'program' => $this->program?->name,
            'academic_year' => $this->academicYear?->description,
            'status' => $this->status,
            'created_at' => $this->created_at,
        ];
    }
}
