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
      ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
      : variant === "danger"
        ? "border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
        : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)]";

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
    <label className="flex w-fit items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)]">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onToggle(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"}`}
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
    <div className="glass-card flex flex-col gap-4 rounded-[28px] border border-[var(--border)] p-4 shadow-[var(--shadow-panel)] sm:p-5">
      <div className="flex flex-col gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--sidebar-bg)] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              API Docs JSON
            </div>
            <div className="flex items-center gap-2">
              <a
                href={apiDocsUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm text-[var(--foreground)] hover:text-[var(--accent)]"
                title={apiDocsUrl}
              >
                {apiDocsUrl}
              </a>
              <ExternalLink className="h-4 w-4 shrink-0 text-[var(--muted)]" />
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
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo path, summary hoặc operation id..."
            className="h-12 w-full rounded-full border border-[var(--border)] bg-[var(--input-bg)] pl-11 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
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
        <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1.5 text-[var(--accent)]">
          {selectedCount} đã chọn
        </span>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-[var(--muted)]">
          {totalCount} endpoint hiển thị
        </span>
      </div>
    </div>
  );
}
