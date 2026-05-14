<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAuthenticatedUserMatchesRoute
{
    public function handle(Request $request, Closure $next): Response
    {
        $authUser = $request->user();
        $routeUser = $request->route('user');

        if (! $authUser || ! $routeUser) {
            abort(403, 'You are not allowed to access this user resource.');
        }

        if ((bool) ($authUser->is_admin ?? false)) {
            return $next($request);
        }

        if ((int) $authUser->getAuthIdentifier() !== (int) $routeUser->getKey()) {
            abort(403, 'You are not allowed to access this user resource.');
        }

        return $next($request);
    }
}
