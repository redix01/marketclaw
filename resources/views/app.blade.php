<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name', 'MarketClaw') }}</title>

        @if (! app()->environment('testing') && (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot'))))
            @vite('resources/js/main.tsx')
        @endif
    </head>
    <body>
        <div id="app"></div>
    </body>
</html>
