/**
 * Lớp gọi API tới backend Research Agent (starter_v0/server.py).
 *
 * Đi qua proxy của Vite (xem vite.config.ts) nên base URL để rỗng là đủ.
 * API key nằm ở server (.env), không có key nào lọt xuống trình duyệt.
 */

const BASE = import.meta.env.VITE_API_URL ?? "";

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
}

export type ToolEventStatus = "ok" | "error" | "awaiting_user";

export interface ToolResultRecord {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  round?: number;
  status?: ToolEventStatus;
  error?: string | null;
}

export interface RoundRecord {
  round: number;
  assistant_text: string | null;
  tool_calls: ToolCallRecord[];
  tool_results: ToolResultRecord[];
}

export type TurnStatus = "answered" | "waiting_for_user" | "max_tool_rounds" | "provider_error";

export interface ArtifactVersion {
  version: string;
  artifact_version: string;
  prompt_hash: string;
  tools_hash: string;
}

export interface ChatResponse {
  session_id: string;
  title: string;
  status: TurnStatus;
  assistant_text: string | null;
  error?: string | null;
  rounds: RoundRecord[];
  tool_events: ToolResultRecord[];
  memories: string[];
  artifact_version: ArtifactVersion;
}

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, string>;
  write: boolean;
}

export interface Health {
  status: string;
  provider: string;
  model: string;
  has_api_key: boolean;
  tools: string[];
  artifact_version: ArtifactVersion;
}

export interface SessionSummary {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  turn_count: number;
}

export interface SessionTurn {
  turn_index: number;
  started_at: string;
  ended_at: string;
  user: string;
  status: TurnStatus;
  assistant_text: string | null;
  error?: string | null;
  rounds: RoundRecord[];
  tool_events: ToolResultRecord[];
}

export interface SessionDetail extends ArtifactVersion {
  session_id: string;
  title: string;
  provider: string;
  model: string;
  created_at: string;
  updated_at: string;
  turns: SessionTurn[];
  memories: string[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} trả về ${res.status}`);
  return res.json() as Promise<T>;
}

export const getHealth = () => get<Health>("/api/health");
export const getTools = () => get<ToolSpec[]>("/api/tools");
export const getSessions = () => get<SessionSummary[]>("/api/sessions");
export const getSession = (sessionId: string) =>
  get<SessionDetail>(`/api/sessions/${sessionId}`);

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/sessions/${sessionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Xoá hội thoại thất bại (${res.status})`);
}

export async function sendChat(
  message: string,
  sessionId: string | null,
  maxToolRounds: number,
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId, max_tool_rounds: maxToolRounds }),
  });

  const data = (await res.json().catch(() => ({}))) as ChatResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Backend trả về ${res.status}. Đã chạy 'python server.py' chưa?`);
  }
  return data;
}
