<?php

namespace App\Http\Resources\Admin;

use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $this->user;
        $intern = $user?->intern;
        $requirement = $this->requirement;

        return [
            'id' => $this->id,
            'status' => $this->status,
            'file_name' => basename((string) $this->file_path),
            'file_url' => StorageUrl::url($this->file_path),
            'file_path' => $this->file_path,
            'submitted_at' => $this->created_at,
            'reviewed_at' => $this->reviewed_at,
            'reviewed_by' => $this->reviewer?->full_name,
            // Which placement (host) this file was submitted under. A transferred
            // intern holds one placement per host, so the admin can tell a file
            // from the current host apart from a previous host's record.
            'placement' => $this->placement ? [
                'id' => $this->placement->id,
                'is_current' => $this->placement->isActive(),
                'hte' => $this->placement->hte?->name,
                'assigned_at' => $this->placement->assigned_at,
                'unassigned_at' => $this->placement->unassigned_at,
            ] : null,
            'intern' => $user ? [
                'uuid' => $user->uuid,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'profile_picture' => $user->profile_picture,
                'institute' => $intern?->institute?->name,
                'institute_id' => $intern?->institute_id,
                'program' => $intern?->program?->name,
                'academic_year' => $intern?->academicYear?->description,
                'academic_year_id' => $intern?->academic_year_id,
                'ojt_status' => $intern?->ojt_status,
            ] : null,
            'requirement' => $requirement ? [
                'id' => $requirement->id,
                'name' => $requirement->name,
                'description' => $requirement->description,
                'type' => $requirement->type,
                'institute' => $requirement->institute?->name,
                'institute_id' => $requirement->institute_id,
            ] : null,
        ];
    }
}
