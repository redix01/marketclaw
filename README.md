# MarketClaw Monolith

MarketClaw is now hosted as a single Laravel application that serves the React frontend from the same container and origin as the API.

## Structure

- `backend/`: Laravel API, jobs, migrations, and the HTTP entrypoint.
- `web/`: React/Vite frontend source.
- `docker-compose.yml`: single-app local container deployment with Postgres plus one backend container that also serves the frontend.

## How it works

`backend/Dockerfile` builds the React app from `web/`, copies the compiled assets into Laravel `public/`, and ships one deployable image.

Laravel serves:

- SPA routes like `/`, `/app/*`, `/demo/*`, and `/admin/*`
- API routes under `/api/v1/*`
- health checks under `/up`

## Local verification

Frontend:

```bash
cd web
npm ci
npm run lint
npm run build
```

Backend:

```bash
cd backend
composer install
php artisan test
```

## Deploy

```bash
./scripts/deploy.sh
```

That script starts Postgres and builds one backend image that contains both the API and frontend.

For non-Docker hosting such as cPanel, Laravel can also run against MySQL by setting `DB_CONNECTION=mysql` in `backend/.env`.
