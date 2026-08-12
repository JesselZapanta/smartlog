<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{uuid}', fn ($user, string $uuid) => $user->uuid === $uuid, ['guards' => ['api']]);
