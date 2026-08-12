<?php

use Illuminate\Support\Facades\Route;
use Illuminate\View\View;

$serveFrontend = function (): View {
    return view('app');
};

$redirectLegacyBackendPath = function (?string $path = null) {
    return redirect('/'.ltrim((string) $path, '/'));
};

Route::get('/backend', fn () => redirect('/'));
Route::get('/backend/{path?}', $redirectLegacyBackendPath)->where('path', '.*');

Route::get('/', $serveFrontend)->name('home');
Route::fallback(function () use ($serveFrontend) {
    $requestedPath = request()->path();

    if (! request()->isMethod('GET') && ! request()->isMethod('HEAD')) {
        abort(404);
    }

    if ($requestedPath !== '/' && pathinfo($requestedPath, PATHINFO_EXTENSION) !== '') {
        abort(404);
    }

    return $serveFrontend();
});
