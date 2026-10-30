<?php

namespace Database\Seeders\Concerns;

use Illuminate\Support\Facades\Storage;

/**
 * Writes the placeholder uploads that seeded file paths point at.
 *
 * A seeded submission or enrollment document is useless if the download
 * endpoint 404s, so every seeder that stores a `file_path` writes the file
 * through here instead of faking the database entry alone.
 */
trait WritesDemoFiles
{
    /**
     * Write a placeholder PDF to the public disk and return its path.
     */
    protected function putDemoPdf(string $path): string
    {
        Storage::disk('public')->put($path, $this->demoPdfContents());

        return $path;
    }

    /**
     * Write a placeholder image to the public disk and return its path.
     *
     * One shared file backs every seeded DTR and journal photo: the upload
     * columns only need a resolvable path for the demo, and thousands of
     * copies would slow seeding for no visual benefit.
     */
    protected function putDemoImage(string $path): string
    {
        Storage::disk('public')->put($path, base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
        ));

        return $path;
    }

    /**
     * A tiny single-page PDF, enough for a browser preview or download.
     */
    private function demoPdfContents(): string
    {
        return <<<'PDF'
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
trailer
<< /Size 4 /Root 1 0 R >>
%%EOF
PDF;
    }
}
