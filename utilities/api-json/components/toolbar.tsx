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
  showMissingActualResponseAlert: boolean;
  onSearchChange: (value: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onExtract: () => void;
  onToggleAllTagsOpen: (checked: boolean) => void;
  onToggleMissingActualResponseAlert: (checked: boolean) => void;
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
      ? "bg-[var(--accent)] text-slate-950 hover:bg-[var(--accent-hover)]"
      : variant === "danger"
        ? "border border-rose-400/20 bg-rose-500/8 text-rose-200 hover:bg-rose-500/12"
        : "border border-white/10 bg-[var(--surface-muted)] text-slate-100 hover:border-white/16 hover:bg-white/[0.08]";

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

function ToggleChip({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <label className="flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onToggle(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-[var(--accent)]" : "bg-white/[0.14]"}`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </label>
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
  showMissingActualResponseAlert,
  onSearchChange,
  onSelectAll,
  onClearAll,
  onExtract,
  onToggleAllTagsOpen,
  onToggleMissingActualResponseAlert,
  onOpenSettings,
  onDisconnect,
}: ToolbarProps) {
  return (
    <div className="glass-card flex flex-col gap-4 rounded-[28px] border border-white/8 p-4 shadow-[0_16px_36px_rgba(2,6,23,0.16)] sm:p-5">
      <div className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-[var(--surface-muted)] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">API Docs JSON</div>
            <div className="flex items-center gap-2">
              <a
                href={apiDocsUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm text-slate-200 hover:text-white"
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

        <div className="flex flex-wrap gap-3">
          <ToggleChip
            label="Tự mở tất cả dropdown"
            checked={allTagsOpen}
            onToggle={onToggleAllTagsOpen}
          />
          <ToggleChip
            label="Hiện alert thiếu response thực tế"
            checked={showMissingActualResponseAlert}
            onToggle={onToggleMissingActualResponseAlert}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo path, summary hoặc operation id..."
            className="h-12 w-full rounded-full border border-white/10 bg-[var(--input-bg)] pl-11 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[var(--accent-border)]"
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
        <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1.5 text-slate-100">
          {selectedCount} đã chọn
        </span>
        <span className="rounded-full border border-white/10 px-3 py-1.5 text-slate-300">
          {totalCount} endpoint hiển thị
        </span>
      </div>
    </div>
  );
}
