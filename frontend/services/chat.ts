const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export const CHAT_ENDPOINT = `${API_BASE_URL}/api/chat`;

export interface Source {
  cvId: string;
  name: string | null;
  file: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface Match {
  name: string;
  email: string;
  reason: string;
}

export interface ChatResponse {
  answer: string;
  matches: Match[];
  sources: Source[];
}

export interface ChatArg {
  message: string;
  history: ChatTurn[];
}

function isMatch(value: unknown): value is Match {
  const m = value as Partial<Match> | null;
  return (
    typeof m?.name === "string" &&
    typeof m?.email === "string" &&
    typeof m?.reason === "string"
  );
}

export async function chatFetcher(
  url: string,
  { arg }: { arg: ChatArg },
): Promise<ChatResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const fallback = `Request failed (${response.status})`;
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? fallback);
  }

  const data = (await response.json()) as Partial<{
    answer: string;
    sources: Source[];
  }>;
  const answer = data.answer ?? "";

  let matches: Match[];
  try {
    const parsed = JSON.parse(answer);
    if (!Array.isArray(parsed?.matches)) throw new Error("no matches array");
    matches = parsed.matches.filter(isMatch);
  } catch {
    throw new Error("Received an unexpected response format from the server.");
  }

  return {
    answer,
    matches,
    sources: Array.isArray(data.sources) ? data.sources : [],
  };
}
