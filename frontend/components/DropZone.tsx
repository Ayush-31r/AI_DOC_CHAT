"use client";

import { useCallback, useRef, useState } from "react";

export type UploadStatus = "idle" | "uploading" | "processing" | "ready" | "error";

interface Props {
  status: UploadStatus;
  filename?: string;
  chunkCount?: number;
  errorMsg?: string;
  onFile: (file: File) => void;
}

const ACCEPT = "application/pdf";
const MAX_MB = 20;

export default function DropZone({
  status,
  filename,
  chunkCount,
  errorMsg,
  onFile,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== ACCEPT) {
        alert("Only PDF files are supported.");
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        alert(`File too large. Maximum size is ${MAX_MB} MB.`);
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const isLocked = status === "uploading" || status === "processing";
  const isReady = status === "ready";

  return (
    <div className="w-full">
      <div
        onClick={() => !isLocked && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isLocked) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={!isLocked ? onDrop : undefined}
        className={[
          "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-all duration-200",
          isReady
            ? "border-emerald-500/50 bg-emerald-500/5 cursor-default"
            : isLocked
            ? "border-amber-500/40 bg-amber-500/5 cursor-wait"
            : dragging
            ? "border-sky-400 bg-sky-400/10 cursor-copy scale-[1.01]"
            : status === "error"
            ? "border-red-500/50 bg-red-500/5 cursor-pointer hover:border-red-400"
            : "border-zinc-700 bg-zinc-900/50 cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/50",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={onInputChange}
          disabled={isLocked}
        />

        <div
          className={[
            "flex h-14 w-14 items-center justify-center rounded-xl transition-colors",
            isReady
              ? "bg-emerald-500/15 text-emerald-400"
              : isLocked
              ? "bg-amber-500/15 text-amber-400"
              : status === "error"
              ? "bg-red-500/15 text-red-400"
              : "bg-zinc-800 text-zinc-400",
          ].join(" ")}
        >
          {isReady ? (
            <CheckIcon />
          ) : isLocked ? (
            <SpinnerIcon />
          ) : (
            <PDFIcon />
          )}
        </div>

        <div className="text-center">
          {status === "idle" && (
            <>
              <p className="text-sm font-medium text-zinc-300">
                Drop a PDF here or{" "}
                <span className="text-sky-400 underline underline-offset-2">
                  browse
                </span>
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                PDF only, up to {MAX_MB} MB
              </p>
            </>
          )}

          {status === "uploading" && (
            <p className="text-sm font-medium text-amber-300">
              Uploading{filename ? ` "${filename}"` : ""}...
            </p>
          )}

          {status === "processing" && (
            <>
              <p className="text-sm font-medium text-amber-300">
                Processing{filename ? ` "${filename}"` : ""}...
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Chunking and indexing your document
              </p>
            </>
          )}

          {status === "ready" && (
            <>
              <p className="text-sm font-medium text-emerald-300">
                {filename ?? "Document"} ready
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {chunkCount} chunks indexed
              </p>
              <p className="mt-2 text-xs text-zinc-600">
                Drop a new file to replace
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <p className="text-sm font-medium text-red-400">
                {errorMsg ?? "Upload failed"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Click to try again</p>
            </>
          )}
        </div>

        {isLocked && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 animate-pulse bg-amber-500/5" />
          </div>
        )}
      </div>
    </div>
  );
}

function PDFIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-7 w-7 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}