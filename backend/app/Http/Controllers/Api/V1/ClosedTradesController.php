<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ClosedTradesController extends Controller
{
    public function index(
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
    ): JsonResponse {
        $account = $ensurePaperAccount->handle($user);

        $closedTrades = DB::table('orders')
            ->join('symbols', 'orders.symbol_id', '=', 'symbols.id')
            ->leftJoin('ledger_entries', function ($join) {
                $join->on('orders.id', '=', 'ledger_entries.reference_id')
                    ->where('ledger_entries.reference_type', '=', 'App\Models\Order');
            })
            ->where('orders.user_id', $account->user_id)
            ->where('orders.side', 'sell')
            ->where('orders.status', 'filled')
            ->select(
                'orders.id',
                'symbols.ticker as symbol',
                'symbols.asset_type',
                'orders.quantity',
                'orders.fill_price as exit_price',
                'orders.submitted_at',
                'orders.filled_at',
                'orders.source',
                DB::raw('COALESCE(ledger_entries.meta->\'realized_pnl\', 0) as realized_pnl'),
                DB::raw('COALESCE(ledger_entries.meta->\'pnl_percent\', 0) as pnl_percent'),
                DB::raw('COALESCE(ledger_entries.meta->\'auto_closed\', false) as auto_closed')
            )
            ->orderBy('orders.filled_at', 'desc')
            ->get()
            ->map(function ($trade) {
                $trade->realized_pnl = (float) $trade->realized_pnl;
                $trade->pnl_percent = (float) $trade->pnl_percent;
                $trade->auto_closed = filter_var($trade->auto_closed, FILTER_VALIDATE_BOOLEAN);
                $trade->entry_price = $trade->exit_price / (1 + ($trade->pnl_percent / 100));

                return $trade;
            });

        $summary = [
            'total_trades' => $closedTrades->count(),
            'total_realized_pnl' => round($closedTrades->sum('realized_pnl'), 2),
            'avg_pnl_percent' => $closedTrades->count() > 0
                ? round($closedTrades->avg('pnl_percent'), 2)
                : 0,
            'auto_closed_count' => $closedTrades->where('auto_closed', true)->count(),
            'manual_closed_count' => $closedTrades->where('auto_closed', false)->count(),
        ];

        return response()->json([
            'data' => $closedTrades,
            'summary' => $summary,
        ]);
    }
}
