const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface UploadResponse {
  session_id: string;
  filename: string;
  chunk_count: number;
  message: string;
}

export interface ChatResponse {
  answer: string;
}

export interface HistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface HistoryResponse {
  history: HistoryItem[];
  summary: string;
}

export async function uploadPDF(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? err?.message ?? `Upload failed (${res.status})`);
  }

  return res.json();
}

export async function sendChat(
  sessionId: string,
  question: string
): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, question }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? err?.message ?? `Chat failed (${res.status})`);
  }

  return res.json();
}

export async function getHistory(sessionId: string): Promise<HistoryResponse> {
  const res = await fetch(`${BASE_URL}/api/history/${sessionId}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail ?? err?.message ?? `History fetch failed (${res.status})`);
  }

  return res.json();
}