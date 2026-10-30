<?php

namespace App\Http\Resources\Transfers;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransferRequestResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'status' => $this->status,
            'reason' => $this->reason,
            'intern' => [
                'uuid' => $this->intern?->user?->uuid,
                'name' => $this->intern?->user?->full_name,
                'institute' => $this->intern?->institute?->name,
                'program' => $this->intern?->program?->name,
            ],
            'from_hte' => $this->fromHte ? [
                'id' => $this->fromHte->id,
                'name' => $this->fromHte->name,
            ] : null,
            'to_hte' => $this->toHte ? [
                'id' => $this->toHte->id,
                'name' => $this->toHte->name,
            ] : null,
            'requested_by' => $this->requester?->full_name,
            'accepted_at' => $this->accepted_at,
            'evaluated_at' => $this->evaluated_at,
            'reassigned_at' => $this->reassigned_at,
            'created_at' => $this->created_at,
        ];
    }
}
