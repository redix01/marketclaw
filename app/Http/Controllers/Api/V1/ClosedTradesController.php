<?php

namespace App\Http\Controllers\Api\V1;

use App\Domain\Accounts\Actions\EnsurePaperAccount;
use App\Domain\Trading\Actions\AutoCloseProfitablePositions;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ClosedTradesController extends Controller
{
    public function index(
        User $user,
        EnsurePaperAccount $ensurePaperAccount,
        AutoCloseProfitablePositions $autoCloseProfitablePositions,
    ): JsonResponse {
        $account = $ensurePaperAccount->handle($user);
        $autoCloseProfitablePositions->handle($account);
        $account->refresh();
        $driver = DB::connection()->getDriverName();

        $entryPriceExpr = $driver === 'sqlite'
            ? "json_extract(ledger_entries.meta, '$.entry_price')"
            : "ledger_entries.meta->>'entry_price'";
        $realizedPnlExpr = $driver === 'sqlite'
            ? "CAST(COALESCE(json_extract(ledger_entries.meta, '$.realized_pnl'), '0') AS REAL)"
            : "COALESCE(ledger_entries.meta->>'realized_pnl', '0')::numeric";
        $pnlPercentExpr = $driver === 'sqlite'
            ? "CAST(COALESCE(json_extract(ledger_entries.meta, '$.pnl_percent'), '0') AS REAL)"
            : "COALESCE(ledger_entries.meta->>'pnl_percent', '0')::numeric";
        $autoClosedExpr = $driver === 'sqlite'
            ? "CASE WHEN COALESCE(json_extract(ledger_entries.meta, '$.auto_closed'), 0) IN (1, '1', 'true') THEN 1 ELSE 0 END"
            : "COALESCE(ledger_entries.meta->>'auto_closed', 'false')::boolean";
        $closedByBotExpr = $driver === 'sqlite'
            ? "CASE WHEN COALESCE(json_extract(ledger_entries.meta, '$.closed_by_bot'), CASE WHEN orders.source = 'bot' THEN 1 ELSE 0 END) IN (1, '1', 'true') THEN 1 ELSE 0 END"
            : "COALESCE(ledger_entries.meta->>'closed_by_bot', CASE WHEN orders.source = 'bot' THEN 'true' ELSE 'false' END)::boolean";
        $closeReasonExpr = $driver === 'sqlite'
            ? "COALESCE(json_extract(ledger_entries.meta, '$.close_reason'), CASE WHEN orders.source = 'bot' THEN 'session_reset' ELSE 'manual' END)"
            : "COALESCE(ledger_entries.meta->>'close_reason', CASE WHEN orders.source = 'bot' THEN 'session_reset' ELSE 'manual' END)";

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
                DB::raw("{$entryPriceExpr} as entry_price_meta"),
                DB::raw("{$realizedPnlExpr} as realized_pnl"),
                DB::raw("{$pnlPercentExpr} as pnl_percent"),
                DB::raw("{$autoClosedExpr} as auto_closed"),
                DB::raw("{$closedByBotExpr} as closed_by_bot"),
                DB::raw("{$closeReasonExpr} as close_reason")
            )
            // Stable newest-first ordering. filled_at DESC alone is not
            // enough because the trader:tick cron can fire dozens of
            // auto-closes inside a single second — same-second ties were
            // coming back in physical-row order, which made the dashboard
            // look shuffled. Order by id DESC as a secondary key so within
            // a tied second the most-recently-inserted row wins.
            ->orderBy('orders.filled_at', 'desc')
            ->orderBy('orders.id', 'desc')
            ->get()
            ->map(function ($trade) {
                $trade->realized_pnl = (float) $trade->realized_pnl;
                $trade->pnl_percent = (float) $trade->pnl_percent;
                $trade->auto_closed = filter_var($trade->auto_closed, FILTER_VALIDATE_BOOLEAN);
                $trade->closed_by_bot = filter_var($trade->closed_by_bot, FILTER_VALIDATE_BOOLEAN);

                // Prefer the entry price recorded in meta — the older fallback
                // back-computed it from pnl_percent which collapses to exit
                // when the legacy ledger row stored realized_pnl=0.
                $trade->entry_price = $trade->entry_price_meta !== null
                    ? (float) $trade->entry_price_meta
                    : ($trade->pnl_percent != 0
                        ? (float) $trade->exit_price / (1 + ($trade->pnl_percent / 100))
                        : (float) $trade->exit_price);
                unset($trade->entry_price_meta);

                return $trade;
            });

        $summary = [
            'total_trades' => $closedTrades->count(),
            'total_realized_pnl' => round($closedTrades->sum('realized_pnl'), 2),
            'avg_pnl_percent' => $closedTrades->count() > 0
                ? round($closedTrades->avg('pnl_percent'), 2)
                : 0,
            'auto_closed_count' => $closedTrades->where('auto_closed', true)->count(),
            'bot_closed_count' => $closedTrades->where('closed_by_bot', true)->where('auto_closed', false)->count(),
            'manual_closed_count' => $closedTrades->where('closed_by_bot', false)->count(),
        ];

        return response()->json([
            'data' => $closedTrades,
            'summary' => $summary,
        ]);
    }
}
