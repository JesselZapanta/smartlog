<?php

namespace App\Http\Resources\Intern;

use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PhotoDtrResource extends JsonResource
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
            'dtr_date' => $this->dtr_date->toDateString(),
            'slots' => [
                'am_in' => ['time' => $this->am_in_time, 'photo_url' => StorageUrl::url($this->am_in_photo)],
                'am_out' => ['time' => $this->am_out_time, 'photo_url' => StorageUrl::url($this->am_out_photo)],
                'pm_in' => ['time' => $this->pm_in_time, 'photo_url' => StorageUrl::url($this->pm_in_photo)],
                'pm_out' => ['time' => $this->pm_out_time, 'photo_url' => StorageUrl::url($this->pm_out_photo)],
            ],
            'status' => $this->status,
            'remarks' => $this->remarks,
            'verified_by' => $this->verifier?->full_name,
            'verified_at' => $this->verified_at,
            'checked_by' => $this->checker?->full_name,
            'checked_at' => $this->checked_at,
        ];
    }
}
