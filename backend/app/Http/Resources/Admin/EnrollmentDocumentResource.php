<?php

namespace App\Http\Resources\Admin;

use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One attachment of an OJT enrollment application (COR, curriculum, or a
 * legacy free-text slot), listed for the admin document archive.
 *
 * Institute, program, and academic year come from the application row, not
 * `user.intern`: the intern relation resolves the newest enrollment, which may
 * be a different term than the one this document belongs to.
 */
class EnrollmentDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $enrollment = $this->enrollment;
        $user = $enrollment?->user;

        return [
            'id' => $this->id,
            'document_type' => $this->type,
            'label' => $this->label,
            'file_name' => basename((string) $this->file_path),
            'file_url' => StorageUrl::url($this->file_path),
            'file_path' => $this->file_path,
            'uploaded_at' => $this->created_at,
            'enrollment' => $enrollment ? [
                'id' => $enrollment->id,
                'status' => $enrollment->status,
                'academic_year' => $enrollment->academicYear?->description,
                'academic_year_id' => $enrollment->academic_year_id,
                'institute' => $enrollment->institute?->name,
                'institute_id' => $enrollment->institute_id,
                'program' => $enrollment->program?->name,
            ] : null,
            'intern' => $user ? [
                'uuid' => $user->uuid,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'profile_picture' => $user->profile_picture,
                'institute' => $enrollment?->institute?->name,
                'institute_id' => $enrollment?->institute_id,
                'program' => $enrollment?->program?->name,
                'academic_year' => $enrollment?->academicYear?->description,
                'academic_year_id' => $enrollment?->academic_year_id,
            ] : null,
        ];
    }
}
