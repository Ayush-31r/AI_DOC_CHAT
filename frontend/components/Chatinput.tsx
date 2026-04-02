"use client";

import { useRef, useState, useEffect } from "react";

interface Props {
  disabled: boolean;
  loading: boolean;
  placeholder?: string;
  onSend: (text: string) => void;
}

export default function ChatInput({ disabled, loading, placeholder, onSend }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || loading) return;
    onSend(trimmed);
    setValue("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className={[
        "flex items-end gap-2 rounded-2xl border px-4 py-3 transition-colors",
        disabled
          ? "border-zinc-800 bg-zinc-900/50 opacity-60"
          : loading
          ? "border-zinc-700 bg-zinc-900"
          : "border-zinc-700 bg-zinc-900 focus-within:border-sky-500/60",
      ].join(" ")}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled || loading}
        placeholder={
          placeholder ??
          (disabled
            ? "Upload a PDF to start chatting"
            : "Ask something about the document...")
        }
        className="flex-1 resize-none bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none disabled:cursor-not-allowed"
        style={{ minHeight: "24px" }}
      />

      <button
        onClick={submit}
        disabled={disabled || loading || !value.trim()}
        className={[
          "flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg transition-all",
          !disabled && !loading && value.trim()
            ? "bg-sky-600 text-white hover:bg-sky-500 active:scale-95"
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
        ].join(" ")}
        aria-label="Send message"
      >
        {loading ? <MiniSpinner /> : <SendIcon />}
      </button>
    </div>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  );
}

function MiniSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}