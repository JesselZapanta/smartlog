<?php

namespace App\Http\Resources;

use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OjtEnrollmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'uuid' => $this->user?->uuid,
            'student_name' => $this->user?->full_name ?? '—',
            'email' => $this->user?->email ?? '—',
            'academic_year_id' => $this->academic_year_id,
            'academic_year' => $this->academicYear?->description ?? '—',
            'institute_id' => $this->institute_id,
            'institute' => $this->institute?->name ?? '—',
            'program_id' => $this->program_id,
            'program' => $this->program?->name ?? '—',
            'status' => $this->status,
            'reviewed_by' => $this->reviewer?->full_name,
            'is_editable' => $this->isEditable(),
            'ojt_hours' => $this->ojt_hours,
            'intern_passed' => $this->user?->internEnrollments?->contains(
                fn ($enrollment): bool => $enrollment->grade === 'Passed'
            ) ?? false,
            'rejection_reason' => $this->rejection_reason,
            'reviewed_at' => $this->reviewed_at?->toDateString(),
            'documents' => $this->documents->map(fn ($document): array => [
                'id' => $document->id,
                'label' => $document->label,
                'type' => $document->type,
                'file_path' => $document->file_path,
                'url' => StorageUrl::url($document->file_path),
                'created_at' => $document->created_at?->toDateString(),
            ])->values(),
            // Which required items are still outstanding, so the page can tell the
            // intern exactly what is missing before they submit.
            'missing_requirements' => $this->missingRequiredItems(),
            'created_at' => $this->created_at?->toDateString(),
            'updated_at' => $this->updated_at?->toDateString(),
        ];
    }
}
