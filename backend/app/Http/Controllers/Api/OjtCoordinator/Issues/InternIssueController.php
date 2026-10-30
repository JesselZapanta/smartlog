<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Issues;

class InternIssueController extends BaseIssueController
{
    /**
     * Concerns raised by the intern about the HTE.
     */
    protected function issueType(): string
    {
        return 'intern';
    }
}
