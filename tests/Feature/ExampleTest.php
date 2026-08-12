<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_the_application_returns_a_successful_response(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('id="app"', false);
    }

    public function test_unknown_web_routes_fall_back_to_the_spa_view(): void
    {
        $this->get('/app/overview')
            ->assertOk()
            ->assertSee('id="app"', false);
    }

    public function test_missing_asset_paths_do_not_fall_back_to_the_spa(): void
    {
        $this->get('/assets/missing.js')->assertNotFound();
    }

    public function test_legacy_backend_paths_redirect_to_the_root_app_routes(): void
    {
        $this->get('/backend/app/overview')->assertRedirect('/app/overview');
    }
}
