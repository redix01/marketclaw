FROM composer:2 AS vendor

WORKDIR /app/backend

COPY backend/composer.json backend/composer.lock ./
RUN composer install \
    --no-dev \
    --no-scripts \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --optimize-autoloader

COPY backend/. .
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --optimize-autoloader

FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/. .
RUN npm run build

FROM php:8.4-cli-bookworm

WORKDIR /var/www/html

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    postgresql-client \
    unzip \
    && docker-php-ext-install pdo_pgsql pgsql \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY backend/. .
COPY --from=vendor /app/backend/vendor ./vendor
COPY --from=frontend-build /app/web/dist ./public

RUN chmod +x docker/entrypoint.sh \
    && rm -f bootstrap/cache/*.php \
    && mkdir -p storage/framework/{cache,sessions,testing,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8000

ENTRYPOINT ["./docker/entrypoint.sh"]
