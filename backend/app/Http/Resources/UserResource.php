<?php

namespace App\Http\Resources;

use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'uuid' => $this->uuid,
            'firstname' => $this->firstname,
            'middlename' => $this->middlename,
            'lastname' => $this->lastname,
            'extension' => $this->extension,
            'full_name' => trim(implode(' ', array_filter([
                $this->firstname,
                $this->middlename,
                $this->lastname,
                $this->extension,
            ]))),
            'contact_number' => $this->contact_number,
            'profile_picture' => StorageUrl::url($this->profile_picture),
            'role' => $this->role,
            'institute' => $this->intern?->institute?->name
                ?? $this->coordinator?->institute?->name
                ?? $this->hte?->institute?->name
                ?? null,
            'registration_status' => $this->intern?->status,
            'email' => $this->email,
            'email_verified_at' => $this->email_verified_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
