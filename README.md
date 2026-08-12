# MarketClaw Monolith

MarketClaw is a single Laravel application with the React frontend embedded under Laravel `resources/` and built into `public/build`.

## Structure

- `app/`, `bootstrap/`, `config/`, `database/`, `public/`, `resources/`, `routes/`, `storage/`, `tests/`: the Laravel app.
- `resources/js/`: React frontend source.
- `public/build/`: committed production frontend assets for cPanel and other no-Node deploy targets.

## How it works

Laravel serves:

- SPA routes like `/`, `/app/*`, `/demo/*`, and `/admin/*`
- legacy `/backend/*` URLs redirect to the root routes
- API routes under `/api/v1/*`
- health checks under `/up`

## Local verification

```bash
npm ci
npm run lint
npm run build
composer install
php artisan test
```

The built frontend is committed in `public/build`, so cPanel does not need `npm` on the server.

## Deploy

```bash
./scripts/deploy.sh
```

That script builds the single Laravel image for container deployments.

## cPanel

For cPanel or any other no-Node host:

- use this repo as one Laravel project
- point the domain document root to `public/`
- set `DB_CONNECTION=mysql` in `.env`
- run `composer install`, `php artisan migrate --force`, and `php artisan config:cache`

Do not host from `/backend/`. The application root is now the repository root.
