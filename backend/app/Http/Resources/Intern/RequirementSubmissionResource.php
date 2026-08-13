<?php

namespace App\Http\Resources\Intern;

use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RequirementSubmissionResource extends JsonResource
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
            'requirement_id' => $this->requirement_id,
            'name' => $this->requirement?->name,
            'description' => $this->requirement?->description,
            'type' => $this->requirement?->type,
            'file_url' => StorageUrl::url($this->file_path),
            'file_name' => basename($this->file_path),
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'reviewed_by' => $this->reviewer?->full_name,
            'reviewed_at' => $this->reviewed_at,
            'submitted_at' => $this->created_at,
        ];
    }
}
