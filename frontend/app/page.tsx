"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import DropZone, { UploadStatus } from "@/components/DropZone";
import MessageBubble, { Message } from "@/components/Messagebubble";
import ChatInput from "@/components/Chatinput";
import TypingIndicator from "@/components/Typingindicator";
import { uploadPDF, sendChat } from "@/lib/api";

let msgCounter = 0;
const uid = () => String(++msgCounter);

export default function Home() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [chunkCount, setChunkCount] = useState<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const handleFile = useCallback(async (file: File) => {
    setUploadStatus("uploading");
    setUploadError("");
    setFilename(file.name);
    setMessages([]);
    setSessionId("");

    try {
      const data = await uploadPDF(file);
      setUploadStatus("processing");
      await new Promise((r) => setTimeout(r, 600));
      setSessionId(data.session_id);
      setChunkCount(data.chunk_count);
      setFilename(data.filename ?? file.name);
      setUploadStatus("ready");
      setMessages([
        {
          id: uid(),
          role: "assistant",
          content: `Document ready. ${data.chunk_count} chunks indexed. Ask me anything about "${data.filename ?? file.name}".`,
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong during upload.";
      const friendly = msg.toLowerCase().includes("scanned")
        ? "This looks like a scanned PDF. Text extraction is not supported for image-only PDFs."
        : msg.toLowerCase().includes("password") || msg.toLowerCase().includes("encrypt")
        ? "This PDF is password-protected. Please remove the password and try again."
        : msg;
      setUploadError(friendly);
      setUploadStatus("error");
    }
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionId) return;
      const userMsg: Message = { id: uid(), role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setChatLoading(true);
      try {
        const data = await sendChat(sessionId, text);
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", content: data.answer },
        ]);
      } catch (err) {
        const raw = err instanceof Error ? err.message : "Request failed.";
        const friendly = raw.toLowerCase().includes("timeout")
          ? "The request timed out. The document may be large or the server is busy. Try again."
          : raw.toLowerCase().includes("503") || raw.toLowerCase().includes("unavailable")
          ? "The backend is temporarily unavailable. Please try again in a moment."
          : raw;
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", content: friendly, error: true },
        ]);
      } finally {
        setChatLoading(false);
      }
    },
    [sessionId]
  );

  const chatReady = uploadStatus === "ready" && Boolean(sessionId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-sky-600/20 border border-sky-600/40 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-4 w-4 text-sky-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              PDF Chat
            </span>
          </div>
          {sessionId && (
            <span className="text-xs text-zinc-500 font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md truncate max-w-[180px]">
              {sessionId}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 flex flex-col gap-5">
        <DropZone
          status={uploadStatus}
          filename={filename}
          chunkCount={chunkCount}
          errorMsg={uploadError}
          onFile={handleFile}
        />

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-[320px] max-h-[calc(100vh-380px)]">
            {!chatReady && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-16 text-center">
                <p className="text-zinc-600 text-sm">
                  Upload a PDF above to get started.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {chatLoading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          <div className="pt-2">
            <ChatInput
              disabled={!chatReady}
              loading={chatLoading}
              onSend={handleSend}
            />
            {chatReady && (
              <p className="mt-2 text-center text-xs text-zinc-700">
                Shift + Enter for new line
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}