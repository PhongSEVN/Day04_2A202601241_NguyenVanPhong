import { useEffect, useRef, useState } from "react";

import AgentTrace from "@/components/AgentTrace";
import {
  deleteSession,
  getHealth,
  getSession,
  getSessions,
  getTools,
  sendChat,
  type ArtifactVersion,
  type Health,
  type RoundRecord,
  type SessionSummary,
  type ToolResultRecord,
  type ToolSpec,
  type TurnStatus,
} from "@/lib/api";

const LAST_SESSION_KEY = "research-agent.last-session-id";

interface Turn {
  question: string;
  loading?: boolean;
  status?: TurnStatus;
  assistantText?: string | null;
  error?: string | null;
  rounds?: RoundRecord[];
  toolEvents?: ToolResultRecord[];
  durationMs?: number;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [maxToolRounds, setMaxToolRounds] = useState(4);

  const [health, setHealth] = useState<Health | null>(null);
  const [artifactVersion, setArtifactVersion] = useState<ArtifactVersion | null>(null);
  const [tools, setTools] = useState<ToolSpec[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [memories, setMemories] = useState<string[]>([]);
  const [backendDown, setBackendDown] = useState(false);
  const [openTool, setOpenTool] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  function refreshSessions() {
    getSessions().then(setSessions).catch(() => undefined);
  }

  async function loadSession(id: string) {
    try {
      const detail = await getSession(id);
      setSessionId(detail.session_id);
      setMemories(detail.memories);
      setArtifactVersion({
        version: detail.version,
        artifact_version: detail.artifact_version,
        prompt_hash: detail.prompt_hash,
        tools_hash: detail.tools_hash,
      });
      setTurns(
        detail.turns.map((t) => ({
          question: t.user,
          status: t.status,
          assistantText: t.assistant_text,
          error: t.error,
          rounds: t.rounds,
          toolEvents: t.tool_events,
          durationMs: new Date(t.ended_at).getTime() - new Date(t.started_at).getTime(),
        })),
      );
      localStorage.setItem(LAST_SESSION_KEY, detail.session_id);
    } catch {
      startNewChat();
    }
  }

  function startNewChat() {
    setSessionId(null);
    setTurns([]);
    setMemories([]);
    localStorage.removeItem(LAST_SESSION_KEY);
  }

  async function removeSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteSession(id).catch(() => undefined);
    if (id === sessionId) startNewChat();
    refreshSessions();
  }

  useEffect(() => {
    getHealth()
      .then((h) => {
        setHealth(h);
        setArtifactVersion(h.artifact_version);
      })
      .catch(() => setBackendDown(true));
    getTools().then(setTools).catch(() => undefined);
    refreshSessions();

    const lastId = localStorage.getItem(LAST_SESSION_KEY);
    if (lastId) loadSession(lastId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    const at = turns.length;
    setTurns((prev) => [...prev, { question: text }]);

    try {
      const response = await sendChat(text, sessionId, maxToolRounds);
      if (!sessionId) setSessionId(response.session_id);
      localStorage.setItem(LAST_SESSION_KEY, response.session_id);
      setMemories(response.memories);
      setArtifactVersion(response.artifact_version);
      setTurns((prev) =>
        prev.map((t, i) =>
          i === at
            ? {
                ...t,
                status: response.status,
                assistantText: response.assistant_text,
                error: response.error,
                rounds: response.rounds,
                toolEvents: response.tool_events,
              }
            : t,
        ),
      );
      refreshSessions();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Lỗi không xác định";
      setTurns((prev) => prev.map((t, i) => (i === at ? { ...t, error: message } : t)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-background text-on-surface w-full overflow-hidden">
      {/* ------------------------------- SIDEBAR ------------------------------- */}
      <aside className="w-80 border-r border-outline-variant bg-surface flex flex-col shrink-0 overflow-y-auto chat-scroll">
        <div className="px-5 py-4 border-b border-outline-variant">
          <h1 className="font-bold text-base text-primary leading-tight">
            Trợ Lý Tóm Tắt
            <br />
            Nghiên Cứu Khoa Học
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">Research Agent — tool-calling</p>
        </div>

        {/* Lịch sử trò chuyện */}
        <div className="px-5 py-4 border-b border-outline-variant">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Lịch sử trò chuyện
            </h2>
            <button
              onClick={startNewChat}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Mới
            </button>
          </div>
          <div className="space-y-1">
            {sessions.map((s) => (
              <div
                key={s.session_id}
                onClick={() => loadSession(s.session_id)}
                className={`group flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer border ${
                  s.session_id === sessionId
                    ? "bg-primary/10 border-primary/30"
                    : "border-transparent hover:bg-surface-container-lowest"
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">
                  chat_bubble
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-tight">{s.title}</p>
                  <p className="text-[11px] text-on-surface-variant">
                    {s.turn_count} lượt · {relativeTime(s.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => removeSession(s.session_id, e)}
                  className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error shrink-0"
                  title="Xoá hội thoại"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-on-surface-variant">Chưa có cuộc trò chuyện nào.</p>
            )}
          </div>
        </div>

        {/* Memories */}
        <div className="px-5 py-4 border-b border-outline-variant">
          <h2 className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2.5">
            🧠 Memories phiên này ({memories.length})
          </h2>
          {memories.length > 0 ? (
            <ul className="space-y-1.5">
              {memories.map((m, i) => (
                <li
                  key={i}
                  className="text-xs text-on-surface-variant leading-relaxed px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant"
                >
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-on-surface-variant">
              Agent chưa ghi nhớ gì — memories xuất hiện khi tool được gọi (vd: tra cứu, đọc bài
              báo, hỏi lại).
            </p>
          )}
        </div>

        {/* Guardrail */}
        <div className="px-5 py-4 border-b border-outline-variant">
          <label className="flex justify-between text-sm font-medium mb-2">
            <span>Số vòng gọi tool tối đa</span>
            <span className="text-primary font-bold">{maxToolRounds}</span>
          </label>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={maxToolRounds}
            onChange={(e) => setMaxToolRounds(parseInt(e.target.value, 10))}
            className="w-full accent-primary"
          />
          <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
            Chặn Agent lặp vô tận khi gọi tool.
          </p>
        </div>

        {/* Tool registry */}
        <div className="px-5 py-4 border-b border-outline-variant">
          <h2 className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2.5">
            🛠️ Tool đã đăng ký ({tools.length})
          </h2>
          <div className="space-y-1.5">
            {tools.map((t) => (
              <div
                key={t.name}
                className="rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden"
              >
                <button
                  onClick={() => setOpenTool(openTool === t.name ? null : t.name)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-surface-container"
                >
                  <code className="text-xs font-mono font-semibold flex-1 truncate">{t.name}</code>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      t.write
                        ? "bg-secondary-fixed text-on-secondary-fixed"
                        : "bg-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    {t.write ? "WRITE" : "READ"}
                  </span>
                </button>
                {openTool === t.name && (
                  <div className="px-2.5 pb-2.5 text-xs text-on-surface-variant space-y-1.5">
                    <p className="leading-relaxed">{t.description}</p>
                    {Object.keys(t.input_schema).length > 0 && (
                      <div>
                        <span className="font-semibold text-on-surface">Tham số:</span>
                        <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                          {Object.entries(t.input_schema).map(([k, v]) => (
                            <li key={k}>
                              <code className="font-mono">{k}</code>
                              {v ? `: ${v}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {tools.length === 0 && (
              <p className="text-xs text-on-surface-variant">Chưa nạp được danh sách tool.</p>
            )}
          </div>
        </div>

        {/* Provider */}
        <div className="px-5 py-4 mt-auto text-xs text-on-surface-variant space-y-1">
          {health ? (
            <>
              <div className="flex justify-between">
                <span>Provider</span>
                <span className="font-semibold text-on-surface">{health.provider}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Model</span>
                <span className="font-semibold text-on-surface truncate">{health.model}</span>
              </div>
              {!health.has_api_key && (
                <p className="text-error font-medium pt-1">
                  Chưa có API key trong .env cho provider này.
                </p>
              )}
            </>
          ) : (
            <span className="text-error font-medium">Backend chưa chạy</span>
          )}
        </div>
      </aside>

      {/* --------------------------------- MAIN -------------------------------- */}
      <div className="flex flex-col h-full bg-surface-bright relative flex-1 min-w-0">
        <header className="flex items-center gap-3 px-6 h-16 w-full bg-surface border-b border-outline-variant shrink-0">
          <span className="material-symbols-outlined text-primary">smart_toy</span>
          <span className="text-lg font-bold text-primary">Research Agent Demo</span>
          {artifactVersion && (
            <span
              title={artifactVersion.artifact_version}
              className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary"
            >
              version: {artifactVersion.version}
            </span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto chat-scroll p-4 lg:p-8 flex flex-col gap-8 max-w-5xl mx-auto w-full">
          {backendDown && (
            <div className="rounded-xl border border-error/40 bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
              <p className="font-semibold mb-1">Không kết nối được backend.</p>
              <p>
                Mở một terminal khác ở thư mục <code>starter_v0/</code> và chạy:{" "}
                <code className="font-mono bg-surface-container px-1.5 py-0.5 rounded">
                  python server.py
                </code>
              </p>
            </div>
          )}

          {turns.length === 0 && !backendDown && (
            <div className="text-center text-on-surface-variant py-10">
              <span className="material-symbols-outlined text-5xl text-primary/40">smart_toy</span>
              <p className="mt-3 text-sm">
                Hỏi tóm tắt một bài báo khoa học, tìm bài báo theo chủ đề, hoặc tra cứu thông tin
                nghiên cứu.
              </p>
            </div>
          )}

          {turns.map((turn, i) => (
            <div key={i} className="space-y-4">
              {/* Câu hỏi */}
              <div className="flex gap-3 max-w-[85%] self-end ml-auto flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold shrink-0 mt-1">
                  U
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-3 min-w-0">
                  <p className="text-sm whitespace-pre-wrap break-words">{turn.question}</p>
                </div>
              </div>

              {/* Trả lời */}
              {(turn.status || turn.error) && !turn.loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 mt-1">
                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {turn.error && !turn.status && (
                      <div className="rounded-xl border border-error/40 bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
                        {turn.error}
                      </div>
                    )}
                    {turn.status && (
                      <AgentTrace
                        status={turn.status}
                        assistantText={turn.assistantText ?? null}
                        error={turn.error}
                        rounds={turn.rounds ?? []}
                        durationMs={turn.durationMs}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shrink-0 mt-1">
                <span className="material-symbols-outlined text-sm">smart_toy</span>
              </div>
              <div className="bg-surface border border-outline-variant rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <span className="ml-2 text-xs text-on-surface-variant">Agent đang suy luận...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Ô nhập */}
        <div className="p-4 bg-surface-bright border-t border-outline-variant shrink-0">
          <div className="max-w-5xl mx-auto">
            <div className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                disabled={loading}
                className="w-full bg-surface border border-outline-variant rounded-full py-3 pl-5 pr-12 focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none shadow-sm text-base disabled:opacity-50"
                placeholder="VD: Tóm tắt bài báo về attention mechanism trên arXiv..."
              />
              <button
                onClick={() => ask(input)}
                disabled={loading || !input.trim()}
                className="absolute inset-y-1 right-1 w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
