<?php

namespace App\Http\Resources\Intern;

use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DailyJournalResource extends JsonResource
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
            'date' => $this->date->toDateString(),
            'title' => $this->title,
            'journal' => $this->journal,
            'status' => $this->status,
            'remarks' => $this->remarks,
            'photos' => $this->whenLoaded('photos', fn (): array => $this->photos
                ->map(fn ($photo): array => [
                    'id' => $photo->id,
                    'photo_url' => StorageUrl::url($photo->photo),
                ])
                ->values()
                ->all()),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
