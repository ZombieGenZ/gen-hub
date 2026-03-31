"use client";

import type { ApiEndpoint } from "@/types/swagger";

const METHOD_STYLES: Record<ApiEndpoint["method"], string> = {
  get: "text-[var(--get)] bg-[color:var(--emerald-soft)]",
  post: "text-[var(--post)] bg-[color:var(--amber-soft)]",
  put: "text-[var(--put)] bg-[color:rgba(14,165,233,0.12)]",
  delete: "text-[var(--delete)] bg-[color:var(--rose-soft)]",
  patch: "text-[var(--patch)] bg-[color:var(--violet-soft)]",
  options: "text-[var(--options)] bg-[color:rgba(20,184,166,0.12)]",
  head: "text-[var(--head)] bg-[color:rgba(51,65,85,0.1)]",
};

interface ApiItemProps {
  endpoint: ApiEndpoint;
  checked: boolean;
  showMissingActualResponseAlert: boolean;
  onToggle: (endpointId: string) => void;
}

export function ApiItem({
  endpoint,
  checked,
  showMissingActualResponseAlert,
  onToggle,
}: ApiItemProps) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-[var(--border)] hover:bg-[var(--surface-muted)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(endpoint.id)}
        className="mt-1 h-4 w-4 rounded border-[var(--border-strong)] bg-white text-[var(--accent)] accent-[var(--accent)]"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex min-w-16 justify-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${METHOD_STYLES[endpoint.method]}`}
          >
            {endpoint.method}
          </span>
          <code className="truncate text-[15px] font-medium text-[var(--foreground)]">
            {endpoint.path}
          </code>
          {showMissingActualResponseAlert && endpoint.hasMissingActualResponseAlert ? (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
              Thiếu response thực tế trong docs
            </span>
          ) : null}
        </div>

        {endpoint.summary && endpoint.summary !== "Không có mô tả" ? (
          <p className="mt-1 truncate text-xs text-[var(--muted)]">{endpoint.summary}</p>
        ) : null}
      </div>
    </label>
  );
}
