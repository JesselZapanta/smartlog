<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;

class ImageOptimizer
{
    /**
     * Store a profile picture normalized to a 512px WebP (quality 80).
     * Returns the relative path on the public disk.
     */
    public static function storeAvatar(UploadedFile $file): string
    {
        $path = 'avatars/'.Str::uuid().'.webp';

        $encoded = ImageManager::gd()
            ->read($file)
            ->orient()
            ->scaleDown(512, 512)
            ->toWebp(80);

        Storage::disk('public')->put($path, $encoded->toString());

        return $path;
    }
}
