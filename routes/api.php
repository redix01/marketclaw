<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\BotController;
use App\Http\Controllers\Api\V1\ClosedTradesController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\LedgerController;
use App\Http\Controllers\Api\V1\MarketController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentMethodController;
use App\Http\Controllers\Api\V1\PreferenceController;
use App\Http\Controllers\Api\V1\PositionController;
use App\Http\Controllers\Api\V1\TraderProfileController;
use App\Http\Controllers\Api\V1\TraderUpgradeRequestController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', HealthController::class);
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/verify-email-code', [AuthController::class, 'verifyEmailCode']);
    Route::post('/auth/resend-verification-code', [AuthController::class, 'resendVerificationCode']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
    Route::get('/markets/symbols', [MarketController::class, 'symbols']);
    Route::get('/payment-methods', [PaymentMethodController::class, 'index']);

    Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

    Route::prefix('users/{user}')->middleware('auth:sanctum', 'auth.user')->group(function (): void {
        Route::get('/me', [MeController::class, 'show']);
        Route::patch('/profile', [MeController::class, 'update']);
        Route::get('/preferences', [PreferenceController::class, 'show']);
        Route::patch('/preferences', [PreferenceController::class, 'update']);

        Route::get('/dashboard', [DashboardController::class, 'show']);

        Route::get('/account', [AccountController::class, 'show']);
        Route::post('/account/deposits', [AccountController::class, 'deposit']);
        Route::post('/account/withdrawals', [AccountController::class, 'withdraw']);

        Route::get('/positions', [PositionController::class, 'index']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/ledger', [LedgerController::class, 'index']);
        Route::get('/closed-trades', [ClosedTradesController::class, 'index']);
        Route::get('/trader-profiles', [TraderProfileController::class, 'index']);
        Route::post('/trader-upgrade-requests', [TraderUpgradeRequestController::class, 'store']);

        Route::post('/bot/start', [BotController::class, 'start']);
        Route::post('/bot/stop', [BotController::class, 'stop']);
    });
});

require __DIR__.'/admin.php';
