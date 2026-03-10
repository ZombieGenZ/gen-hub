"use client";

import { ExternalLink, Loader2, LogOut, Search, Settings2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface ToolbarProps {
  searchQuery: string;
  selectedCount: number;
  totalCount: number;
  loading: boolean;
  disabled: boolean;
  apiDocsUrl: string;
  allTagsOpen: boolean;
  onSearchChange: (value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onExtract: () => void;
  onToggleAllTagsOpen: (checked: boolean) => void;
  onOpenSettings: () => void;
  onDisconnect: () => void;
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}) {
  const variantClass =
    variant === "primary"
      ? "bg-teal-400 text-slate-950 shadow-[0_14px_34px_rgba(20,184,166,0.32)] hover:bg-teal-300"
      : variant === "danger"
        ? "border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/18"
        : "border border-white/10 bg-white/[0.04] text-slate-100 hover:border-white/16 hover:bg-white/[0.08]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass}`}
    >
      {children}
    </button>
  );
}

export function Toolbar({
  searchQuery,
  selectedCount,
  totalCount,
  loading,
  disabled,
  apiDocsUrl,
  allTagsOpen,
  onSearchChange,
  onSelectAll,
  onClearAll,
  onExtract,
  onToggleAllTagsOpen,
  onOpenSettings,
  onDisconnect,
}: ToolbarProps) {
  return (
    <div className="glass-card flex flex-col gap-4 rounded-[28px] border border-white/10 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.28)] sm:p-5">
      <div className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(15,23,42,0.3))] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">API Docs JSON</div>
            <div className="flex items-center gap-2">
              <a
                href={apiDocsUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm text-cyan-300 hover:text-cyan-200"
                title={apiDocsUrl}
              >
                {apiDocsUrl}
              </a>
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ToolbarButton onClick={onOpenSettings}>
              <Settings2 className="mr-2 h-4 w-4" />
              Đổi URL
            </ToolbarButton>
            <ToolbarButton onClick={onDisconnect} variant="danger">
              <LogOut className="mr-2 h-4 w-4" />
              Thoát
            </ToolbarButton>
          </div>
        </div>

        <label className="flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
          <span>Tự mở tất cả dropdown</span>
          <button
            type="button"
            onClick={() => onToggleAllTagsOpen(!allTagsOpen)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${allTagsOpen ? "bg-teal-400" : "bg-white/[0.14]"}`}
            aria-pressed={allTagsOpen}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition ${allTagsOpen ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </label>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo path, summary hoặc operation id..."
            className="h-12 w-full rounded-full border border-white/10 bg-slate-950/70 pl-11 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-400/50"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <ToolbarButton onClick={onSelectAll} disabled={totalCount === 0}>
            Chọn tất cả
          </ToolbarButton>
          <ToolbarButton onClick={onClearAll} disabled={selectedCount === 0}>
            Bỏ chọn tất cả
          </ToolbarButton>
          <ToolbarButton onClick={onExtract} disabled={disabled || loading} variant="primary">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Lấy dữ liệu
          </ToolbarButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1.5 text-teal-100">
          {selectedCount} đã chọn
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300">
          {totalCount} endpoint hiển thị
        </span>
      </div>
    </div>
  );
}
