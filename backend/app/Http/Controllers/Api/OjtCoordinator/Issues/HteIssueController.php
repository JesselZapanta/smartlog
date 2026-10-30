<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Issues;

class HteIssueController extends BaseIssueController
{
    /**
     * Concerns raised by the HTE about the intern.
     */
    protected function issueType(): string
    {
        return 'hte';
    }
}
