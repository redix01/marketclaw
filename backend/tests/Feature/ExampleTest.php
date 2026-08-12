<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_unknown_web_routes_fall_back_to_the_built_frontend(): void
    {
        $indexPath = public_path('index.html');
        $backupPath = $indexPath.'.bak-test';

        if (File::exists($indexPath)) {
            File::move($indexPath, $backupPath);
        }

        File::put($indexPath, '<!doctype html><html><body>marketclaw-spa</body></html>');

        try {
            $this->get('/app/overview')
                ->assertOk()
                ->assertSee('marketclaw-spa', false);
        } finally {
            File::delete($indexPath);

            if (File::exists($backupPath)) {
                File::move($backupPath, $indexPath);
            }
        }
    }

    public function test_missing_asset_paths_do_not_fall_back_to_the_spa(): void
    {
        $this->get('/assets/missing.js')->assertNotFound();
    }
}
