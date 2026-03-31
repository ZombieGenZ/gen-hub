"use client";

import { Check, Copy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface JsonViewerProps {
  open: boolean;
  value: object | null;
  selectedCount: number;
  onClose: () => void;
}

export function JsonViewer({ open, value, selectedCount, onClose }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const payload = useMemo(() => {
    if (!value) {
      return null;
    }

    const fullText = JSON.stringify(value, null, 2);

    return {
      fullText,
      prettyLines: formatJsonWithHighlighting(fullText),
      size: new TextEncoder().encode(fullText).length,
    };
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  async function handleCopy() {
    if (!payload) {
      return;
    }

    await navigator.clipboard.writeText(payload.fullText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (!open || !payload) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-4"
      onClick={onClose}
    >
      <section
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--panel-strong)] shadow-[0_20px_44px_rgba(2,6,23,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">JSON kết quả</h2>
              <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300">
                {selectedCount} API
              </span>
            </div>
            <p className="text-xs text-slate-400">Dung lượng {formatBytes(payload.size)}</p>
          </div>

          <div className="flex items-center gap-2">
            <CopyButton copied={copied} disabled={false} onClick={handleCopy} />
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[var(--surface-muted)] text-slate-200 transition hover:border-white/18 hover:bg-white/[0.08]"
              aria-label="Đóng modal JSON"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="json-scroll overflow-auto px-5 py-5">
          <pre className="json-view m-0 text-sm leading-7">
            <code>
              {payload.prettyLines.map((line, index) => (
                <span
                  key={`${index}-${line}`}
                  className="json-line"
                  dangerouslySetInnerHTML={{ __html: line }}
                />
              ))}
            </code>
          </pre>
        </div>
      </section>
    </div>
  );
}

function CopyButton({
  copied,
  disabled,
  onClick,
}: {
  copied: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-[var(--surface-muted)] px-4 text-sm text-slate-200 transition hover:border-white/18 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
    >
      {copied ? <Check className="h-4 w-4 text-slate-100" /> : <Copy className="h-4 w-4" />}
      {copied ? "Đã copy" : "Copy JSON"}
    </button>
  );
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatJsonWithHighlighting(json: string) {
  return json.split("\n").map((line) => {
    let escaped = escapeHtml(line);

    escaped = escaped.replace(
      /"([^"\\]*(?:\\.[^"\\]*)*)"(?=\s*:)/g,
      '<span class="json-key">"$1"</span>',
    );
    escaped = escaped.replace(
      /:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g,
      ': <span class="json-string">"$1"</span>',
    );
    escaped = escaped.replace(
      /:\s*(-?\d+(?:\.\d+)?(?:e[+\-]?\d+)?)/gi,
      ': <span class="json-number">$1</span>',
    );
    escaped = escaped.replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>');
    escaped = escaped.replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
    escaped = escaped.replace(/[{}[\]]/g, (match) => `<span class="json-brace">${match}</span>`);

    return escaped;
  });
}
