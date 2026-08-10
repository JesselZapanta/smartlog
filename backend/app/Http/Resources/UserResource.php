<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

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
            'profile_picture' => $this->profile_picture ? Storage::disk('public')->url($this->profile_picture) : null,
            'role' => $this->role,
            'email' => $this->email,
            'email_verified_at' => $this->email_verified_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
