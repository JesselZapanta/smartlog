<?php

namespace App\Support;

class StorageUrl
{
    /**
     * Build a public storage URL from the current request's host,
     * so URLs always match the domain the client used (dev: localhost,
     * prod: smartlog-api.jezyk.me) instead of relying on APP_URL.
     */
    public static function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $request = request();

        if ($request) {
            return $request->getSchemeAndHttpHost().'/storage/'.ltrim($path, '/');
        }

        return config('app.url').'/storage/'.ltrim($path, '/');
    }
}
