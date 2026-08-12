<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

$serveFrontend = function () {
    $frontendEntry = public_path('index.html');
    $requestedPath = request()->path();

    if (! request()->isMethod('GET') && ! request()->isMethod('HEAD')) {
        abort(404);
    }

    if ($requestedPath !== '/' && pathinfo($requestedPath, PATHINFO_EXTENSION) !== '') {
        abort(404);
    }

    if (File::exists($frontendEntry)) {
        return response(File::get($frontendEntry), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    return view('welcome');
};

Route::get('/', $serveFrontend)->name('home');
Route::fallback($serveFrontend);
