"use client";

import type { ApiEndpoint } from "@/types/swagger";

const METHOD_STYLES: Record<ApiEndpoint["method"], string> = {
  get: "text-[var(--get)] bg-[color:var(--emerald-soft)]",
  post: "text-[var(--post)] bg-[color:var(--amber-soft)]",
  put: "text-[var(--put)] bg-[color:rgba(249,115,22,0.16)]",
  delete: "text-[var(--delete)] bg-[color:var(--rose-soft)]",
  patch: "text-[var(--patch)] bg-[color:var(--violet-soft)]",
  options: "text-sky-300 bg-sky-500/10",
  head: "text-slate-300 bg-slate-500/10",
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
    <label className="group flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition hover:bg-white/[0.04]">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(endpoint.id)}
        className="mt-1 h-4 w-4 rounded border-white/15 bg-slate-950 text-teal-400 accent-teal-400"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex min-w-16 justify-center px-0 py-0 text-[12px] font-bold uppercase tracking-[0.18em] ${METHOD_STYLES[endpoint.method]} bg-transparent`}
          >
            {endpoint.method}
          </span>
          <code className="truncate text-[15px] font-medium text-cyan-300">{endpoint.path}</code>
          {showMissingActualResponseAlert && endpoint.hasMissingActualResponseAlert ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
              Thiếu response thực tế trong docs
            </span>
          ) : null}
        </div>

        {endpoint.summary && endpoint.summary !== "Không có mô tả" ? (
          <p className="mt-1 truncate text-xs text-slate-500">{endpoint.summary}</p>
        ) : null}
      </div>
    </label>
  );
}
