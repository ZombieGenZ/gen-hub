"use client";

import { ChevronDown } from "lucide-react";
import { ApiItem } from "@/components/api-item";
import type { TagGroup as TagGroupType } from "@/types/swagger";

interface TagGroupProps {
  group: TagGroupType;
  selectedIds: Set<string>;
  open: boolean;
  showMissingActualResponseAlert: boolean;
  onToggleOpen: (tag: string) => void;
  onToggleEndpoint: (endpointId: string) => void;
  onToggleGroup: (tag: string, endpointIds: string[], checked: boolean) => void;
}

export function TagGroup({
  group,
  selectedIds,
  open,
  showMissingActualResponseAlert,
  onToggleOpen,
  onToggleEndpoint,
  onToggleGroup,
}: TagGroupProps) {
  const endpointIds = group.endpoints.map((endpoint) => endpoint.id);
  const checkedCount = endpointIds.filter((endpointId) => selectedIds.has(endpointId)).length;
  const allChecked = checkedCount > 0 && checkedCount === endpointIds.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.02]">
      <div className="flex flex-wrap items-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={() => onToggleOpen(group.tag)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-teal-300">
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-2xl font-semibold text-teal-400">{group.tag}</h3>
              <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300">
                {group.endpoints.length} API
              </span>
              {checkedCount > 0 ? (
                <span className="rounded-md border border-teal-400/25 bg-teal-400/10 px-2 py-1 text-[11px] text-teal-200">
                  {checkedCount} đã chọn
                </span>
              ) : null}
            </div>
          </div>
        </button>

        <label className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(event) => onToggleGroup(group.tag, endpointIds, event.target.checked)}
            className="h-4 w-4 rounded border-white/15 bg-slate-950 accent-teal-400"
          />
          Chọn tất cả nhóm
        </label>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 border-t border-white/10 px-4 py-4">
            {group.endpoints.map((endpoint) => (
              <ApiItem
                key={endpoint.id}
                endpoint={endpoint}
                checked={selectedIds.has(endpoint.id)}
                showMissingActualResponseAlert={showMissingActualResponseAlert}
                onToggle={onToggleEndpoint}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
