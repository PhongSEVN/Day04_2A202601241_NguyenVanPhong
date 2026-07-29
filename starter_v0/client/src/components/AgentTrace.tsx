import { useState } from "react";
import Markdown from "@/components/Markdown";
import type { RoundRecord, ToolEventStatus, ToolResultRecord, TurnStatus } from "@/lib/api";

/**
 * Hiển thị trace của một lượt chạy Agent: từng round gọi model, tool nào được
 * gọi với tham số gì, kết quả/lỗi trả về ra sao — đúng bằng chứng README yêu cầu.
 */

const STATUS_LABEL: Record<TurnStatus, string> = {
  answered: "Đã trả lời",
  waiting_for_user: "Đang chờ bạn bổ sung thông tin",
  max_tool_rounds: "Dừng vì vượt số vòng gọi tool tối đa",
  provider_error: "Lỗi provider",
};

function isErrorResult(result: unknown): boolean {
  return typeof result === "object" && result !== null && "error" in (result as Record<string, unknown>);
}

const EVENT_STATUS_STYLE: Record<ToolEventStatus, { label: string; className: string }> = {
  ok: { label: "OK", className: "bg-secondary-fixed text-on-secondary-fixed" },
  error: { label: "LỖI", className: "bg-error-container text-on-error-container" },
  awaiting_user: { label: "CHỜ USER", className: "bg-tertiary-container text-on-tertiary-container" },
};

function ToolCallCard({ event, index }: { event: ToolResultRecord; index: number }) {
  const hasError = isErrorResult(event.result);
  // `status`/`round` do server.py gắn thêm; fallback cho transcript cũ chưa có field.
  const status: ToolEventStatus = event.status ?? (hasError ? "error" : "ok");
  const badge = EVENT_STATUS_STYLE[status];
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-container border-b border-outline-variant">
        <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center shrink-0">
          {index}
        </span>
        <code className="text-xs font-mono font-semibold text-on-surface">{event.tool}</code>
        {typeof event.round === "number" && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
            round {event.round}
          </span>
        )}
        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {event.error && (
        <div className="px-3 pt-2 text-xs font-mono text-on-error-container break-all">{event.error}</div>
      )}

      <div className="p-3 space-y-2.5 text-sm">
        {Object.keys(event.args || {}).length > 0 && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1">
              ⚡ Tham số
            </div>
            <code className="block font-mono text-xs bg-surface-container-high rounded-lg px-2.5 py-2 text-on-surface break-all whitespace-pre-wrap">
              {JSON.stringify(event.args, null, 2)}
            </code>
          </div>
        )}

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-1">
            👁️ Kết quả
          </div>
          <pre
            className={`text-xs whitespace-pre-wrap break-words rounded-lg px-2.5 py-2 max-h-56 overflow-y-auto font-mono ${
              hasError
                ? "bg-error-container/40 text-on-error-container"
                : "bg-surface-container-high text-on-surface"
            }`}
          >
            {JSON.stringify(event.result, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function RoundCard({ round }: { round: RoundRecord }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          Round {round.round}
        </span>
        <span className="flex-1 h-px bg-outline-variant" />
        <span className="text-[11px] text-on-surface-variant">
          {round.tool_results.length} tool call
        </span>
      </div>
      {round.assistant_text && (
        <p className="text-xs text-on-surface-variant italic px-1">
          💭 {round.assistant_text}
        </p>
      )}
      {round.tool_results.map((event, i) => (
        <ToolCallCard key={`${round.round}-${i}`} event={event} index={i + 1} />
      ))}
    </div>
  );
}

export default function AgentTrace({
  status,
  assistantText,
  error,
  rounds,
  durationMs,
}: {
  status: TurnStatus;
  assistantText: string | null;
  error?: string | null;
  rounds: RoundRecord[];
  durationMs?: number;
}) {
  const [open, setOpen] = useState(false);
  const toolEventCount = rounds.reduce((sum, r) => sum + r.tool_results.length, 0);
  const toolsUsed = Array.from(
    new Set(rounds.flatMap((r) => r.tool_results.map((e) => e.tool))),
  );

  return (
    <div className="min-w-0">
      {error && (
        <div className="mb-3 rounded-lg border border-error/40 bg-error-container/40 px-3 py-2 text-sm text-on-error-container">
          {error}
        </div>
      )}

      {toolEventCount > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-2"
          >
            <span className="material-symbols-outlined text-[16px]">
              {open ? "expand_less" : "expand_more"}
            </span>
            Trace ({rounds.length} round, {toolEventCount} tool call)
          </button>

          {open && (
            <div className="space-y-3">
              {rounds.map((round) => (
                <RoundCard key={round.round} round={round} />
              ))}
            </div>
          )}
        </div>
      )}

      {assistantText && (
        <div
          className={`rounded-xl px-4 py-3 border ${
            status === "waiting_for_user"
              ? "border-secondary/50 bg-secondary-fixed/40"
              : "border-outline-variant bg-surface-container-lowest"
          }`}
        >
          <Markdown content={assistantText} className="text-base leading-relaxed space-y-2 break-words" />
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
        <span
          className={`flex items-center gap-1 font-medium ${
            status === "provider_error" ? "text-error" : ""
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {status === "answered" ? "check_circle" : status === "provider_error" ? "error" : "hourglass_top"}
          </span>
          {STATUS_LABEL[status]}
        </span>
        {typeof durationMs === "number" && (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {(durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {toolsUsed.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">build</span>
            {toolsUsed.join(", ")}
          </span>
        )}
        {toolsUsed.length === 0 && status === "answered" && (
          <span className="text-secondary font-medium">không gọi tool nào</span>
        )}
      </div>
    </div>
  );
}
