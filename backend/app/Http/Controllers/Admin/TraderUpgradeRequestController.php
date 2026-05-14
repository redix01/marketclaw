<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateTraderUpgradeRequestStatusRequest;
use App\Models\TraderUpgradeRequest;
use App\Support\Api\FrontendPayload;
use Illuminate\Http\JsonResponse;

class TraderUpgradeRequestController extends Controller
{
    public function index(): JsonResponse
    {
        $requests = TraderUpgradeRequest::query()
            ->with(['user', 'reviewer'])
            ->latest()
            ->get()
            ->map(function (TraderUpgradeRequest $request): array {
                $payload = FrontendPayload::traderUpgradeRequest($request);
                $payload['user_name'] = $request->user?->name;
                $payload['user_email'] = $request->user?->email;

                return $payload;
            });

        return response()->json([
            'data' => $requests,
        ]);
    }

    public function update(
        UpdateTraderUpgradeRequestStatusRequest $request,
        TraderUpgradeRequest $traderUpgradeRequest,
    ): JsonResponse {
        $traderUpgradeRequest->forceFill([
            'status' => $request->validated('status'),
            'admin_notes' => $request->validated('admin_notes'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        $traderUpgradeRequest->load(['user', 'reviewer']);
        $payload = FrontendPayload::traderUpgradeRequest($traderUpgradeRequest);
        $payload['user_name'] = $traderUpgradeRequest->user?->name;
        $payload['user_email'] = $traderUpgradeRequest->user?->email;

        return response()->json([
            'message' => 'Upgrade request updated successfully.',
            'data' => $payload,
        ]);
    }
}
