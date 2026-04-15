<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiCors
{
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->headers->get('Origin');
        $allowedOrigins = array_filter(array_map('trim', explode(',', (string) env('FRONTEND_URLS', ''))));

        if ($request->isMethod('OPTIONS')) {
            $response = response('', 204);
        } else {
            $response = $next($request);
        }

        if ($origin && in_array($origin, $allowedOrigins, true)) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Vary', 'Origin');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        }

        return $response;
    }
}
