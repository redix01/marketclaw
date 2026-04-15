<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Symbol;
use Illuminate\Http\JsonResponse;

class MarketController extends Controller
{
    public function symbols(): JsonResponse
    {
        $symbols = Symbol::query()
            ->with('latestQuote')
            ->where('is_active', true)
            ->where('tradeable', true)
            ->orderBy('ticker')
            ->get()
            ->map(function (Symbol $symbol): array {
                $quote = $symbol->latestQuote;

                return [
                    'id' => $symbol->id,
                    'symbol' => $symbol->ticker,
                    'name' => $symbol->name,
                    'type' => $symbol->asset_type,
                    'price' => $quote ? (float) $quote->price : null,
                    'change' => $quote ? (float) $quote->change : 0.0,
                    'changePercent' => $quote ? (float) $quote->change_percent : 0.0,
                    'quotedAt' => optional($quote?->quoted_at)->toISOString(),
                ];
            })
            ->values();

        return response()->json([
            'data' => $symbols,
        ]);
    }
}
