"use client";

import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { JsonViewer } from "@/components/json-viewer";
import { TagGroup } from "@/components/tag-group";
import { Toolbar } from "@/components/toolbar";
import {
  extractSelectedJson,
  fetchSwaggerSpec,
  groupByTags,
  parseEndpoints,
} from "@/lib/swagger-parser";
import type { ApiEndpoint, SwaggerSpec, TagGroup as TagGroupType } from "@/types/swagger";

const STORAGE_API_DOCS_URL_KEY = "genhub-api-json.api-docs-url";
const STORAGE_ALL_TAGS_OPEN_KEY = "genhub-api-json.all-tags-open";
const DEFAULT_ALL_TAGS_OPEN = false;
const DEFAULT_API_DOCS_URL = "https://api.gen-hub.dev/api-docs-json";

export function ApiExplorer() {
  const [spec, setSpec] = useState<SwaggerSpec | null>(null);
  const [tagGroups, setTagGroups] = useState<TagGroupType[]>([]);
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<Set<string>>(new Set());
  const [resultJson, setResultJson] = useState<object | null>(null);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openTags, setOpenTags] = useState<Set<string>>(new Set());
  const [apiDocsUrl, setApiDocsUrl] = useState("");
  const [draftApiDocsUrl, setDraftApiDocsUrl] = useState(DEFAULT_API_DOCS_URL);
  const [allTagsOpen, setAllTagsOpen] = useState(DEFAULT_ALL_TAGS_OPEN);
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedApiDocsUrl = window.localStorage.getItem(STORAGE_API_DOCS_URL_KEY) ?? "";
    const savedAllTagsOpen = window.localStorage.getItem(STORAGE_ALL_TAGS_OPEN_KEY);
    const initialAllTagsOpen =
      savedAllTagsOpen === null ? DEFAULT_ALL_TAGS_OPEN : savedAllTagsOpen === "true";

    setAllTagsOpen(initialAllTagsOpen);

    if (savedApiDocsUrl) {
      setApiDocsUrl(savedApiDocsUrl);
      setDraftApiDocsUrl(savedApiDocsUrl);
      setIsConfigOpen(false);
      void loadSwagger(savedApiDocsUrl, initialAllTagsOpen);
    } else {
      setDraftApiDocsUrl(DEFAULT_API_DOCS_URL);
      setIsConfigOpen(true);
    }

    setIsInitialized(true);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return tagGroups;
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    return tagGroups
      .map((group) => ({
        ...group,
        endpoints: group.endpoints.filter((endpoint) =>
          `${endpoint.path} ${endpoint.summary} ${endpoint.operationId ?? ""} ${endpoint.tags.join(" ")}`
            .toLowerCase()
            .includes(normalizedQuery),
        ),
      }))
      .filter((group) => group.endpoints.length > 0);
  }, [searchQuery, tagGroups]);

  const visibleEndpoints = useMemo(
    () => filteredGroups.flatMap((group) => group.endpoints),
    [filteredGroups],
  );

  const selectedEndpoints = useMemo(() => {
    const endpointMap = new Map<string, ApiEndpoint>();
    tagGroups.forEach((group) => {
      group.endpoints.forEach((endpoint) => endpointMap.set(endpoint.id, endpoint));
    });

    return Array.from(selectedEndpointIds)
      .map((endpointId) => endpointMap.get(endpointId))
      .filter((endpoint): endpoint is ApiEndpoint => Boolean(endpoint));
  }, [selectedEndpointIds, tagGroups]);

  async function loadSwagger(nextApiDocsUrl: string, nextAllTagsOpen = allTagsOpen) {
    try {
      setLoading(true);
      setError(null);

      const nextSpec = await fetchSwaggerSpec(nextApiDocsUrl);
      const endpoints = parseEndpoints(nextSpec);
      const nextTagGroups = groupByTags(endpoints, nextSpec);

      setSpec(nextSpec);
      setTagGroups(nextTagGroups);
      setSelectedEndpointIds(new Set());
      setResultJson(null);
      setIsJsonModalOpen(false);
      setOpenTags(
        nextAllTagsOpen ? new Set(nextTagGroups.map((group) => group.tag)) : new Set(),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể tải Swagger JSON.");
    } finally {
      setLoading(false);
    }
  }

  function handleToggleEndpoint(endpointId: string) {
    setSelectedEndpointIds((current) => {
      const next = new Set(current);
      if (next.has(endpointId)) {
        next.delete(endpointId);
      } else {
        next.add(endpointId);
      }
      return next;
    });
  }

  function handleToggleGroup(_tag: string, endpointIds: string[], checked: boolean) {
    setSelectedEndpointIds((current) => {
      const next = new Set(current);
      endpointIds.forEach((endpointId) => {
        if (checked) {
          next.add(endpointId);
        } else {
          next.delete(endpointId);
        }
      });
      return next;
    });
  }

  function handleToggleOpen(tag: string) {
    setOpenTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }

  function handleSelectAllVisible() {
    setSelectedEndpointIds((current) => {
      const next = new Set(current);
      visibleEndpoints.forEach((endpoint) => next.add(endpoint.id));
      return next;
    });
  }

  function handleClearAll() {
    setSelectedEndpointIds(new Set());
  }

  async function handleExtract() {
    if (!spec || selectedEndpoints.length === 0) {
      return;
    }

    setExtracting(true);
    try {
      setResultJson(extractSelectedJson(spec, selectedEndpoints));
      setIsJsonModalOpen(true);
    } finally {
      setExtracting(false);
    }
  }

  function handleToggleAllTagsOpen(checked: boolean) {
    setAllTagsOpen(checked);
    window.localStorage.setItem(STORAGE_ALL_TAGS_OPEN_KEY, String(checked));
    setOpenTags(checked ? new Set(tagGroups.map((group) => group.tag)) : new Set());
  }

  async function handleSaveApiDocsUrl() {
    const normalizedUrl = draftApiDocsUrl.trim();
    if (!normalizedUrl) {
      setConfigError("Vui lòng nhập URL api docs json.");
      return;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setConfigError("URL api docs json không hợp lệ.");
      return;
    }

    setConfigError(null);
    setApiDocsUrl(normalizedUrl);
    setDraftApiDocsUrl(normalizedUrl);
    window.localStorage.setItem(STORAGE_API_DOCS_URL_KEY, normalizedUrl);
    setIsConfigOpen(false);
    await loadSwagger(normalizedUrl, allTagsOpen);
  }

  function handleOpenSettings() {
    setDraftApiDocsUrl(apiDocsUrl || DEFAULT_API_DOCS_URL);
    setConfigError(null);
    setIsConfigOpen(true);
  }

  function handleDisconnect() {
    window.localStorage.removeItem(STORAGE_API_DOCS_URL_KEY);
    setApiDocsUrl("");
    setDraftApiDocsUrl(DEFAULT_API_DOCS_URL);
    setSpec(null);
    setTagGroups([]);
    setSelectedEndpointIds(new Set());
    setResultJson(null);
    setIsJsonModalOpen(false);
    setError(null);
    setSearchQuery("");
    setOpenTags(new Set());
    setIsConfigOpen(true);
  }

  const shouldShowSetup = isInitialized && (isConfigOpen || !apiDocsUrl);

  return (
    <div className="space-y-6">
      {!isInitialized ? (
        <section className="glass-card rounded-[28px] border border-white/10 p-6 shadow-[0_18px_55px_rgba(2,6,23,0.28)]">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-48 rounded-full bg-white/[0.08]" />
            <div className="h-12 rounded-2xl bg-white/[0.06]" />
            <div className="h-11 w-40 rounded-full bg-white/[0.08]" />
          </div>
        </section>
      ) : null}

      {shouldShowSetup ? (
        <SetupPanel
          apiDocsUrl={draftApiDocsUrl}
          error={configError}
          loading={loading}
          onApiDocsUrlChange={setDraftApiDocsUrl}
          onSubmit={() => void handleSaveApiDocsUrl()}
          onCancel={apiDocsUrl ? () => setIsConfigOpen(false) : undefined}
        />
      ) : null}

      {isInitialized && !shouldShowSetup ? (
        <section className="space-y-5">
          <Toolbar
            searchQuery={searchQuery}
            selectedCount={selectedEndpointIds.size}
            totalCount={visibleEndpoints.length}
            loading={extracting}
            disabled={selectedEndpointIds.size === 0 || !spec}
            apiDocsUrl={apiDocsUrl}
            allTagsOpen={allTagsOpen}
            onSearchChange={setSearchQuery}
            onSelectAll={handleSelectAllVisible}
            onClearAll={handleClearAll}
            onExtract={handleExtract}
            onToggleAllTagsOpen={handleToggleAllTagsOpen}
            onOpenSettings={handleOpenSettings}
            onDisconnect={handleDisconnect}
          />

          {loading ? (
            <StatePanel
              icon={<Loader2 className="h-6 w-6 animate-spin" />}
              title="Đang tải Swagger JSON"
              description="Utility đang đọc spec và gom nhóm endpoint theo tag."
            />
          ) : error ? (
            <StatePanel
              icon={<AlertTriangle className="h-6 w-6" />}
              title="Không tải được Swagger JSON"
              description={error}
              action={
                <button
                  type="button"
                  onClick={() => void loadSwagger(apiDocsUrl)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/[0.08] px-4 text-sm font-medium text-white transition hover:bg-white/[0.12]"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Thử lại
                </button>
              }
            />
          ) : filteredGroups.length === 0 ? (
            <StatePanel
              icon={<AlertTriangle className="h-6 w-6" />}
              title="Không có endpoint phù hợp"
              description="Thử đổi từ khóa tìm kiếm để hiển thị lại danh sách API."
            />
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <TagGroup
                  key={group.tag}
                  group={group}
                  selectedIds={selectedEndpointIds}
                  open={openTags.has(group.tag)}
                  onToggleOpen={handleToggleOpen}
                  onToggleEndpoint={handleToggleEndpoint}
                  onToggleGroup={handleToggleGroup}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {isInitialized ? (
        <JsonViewer
          open={isJsonModalOpen}
          value={resultJson}
          selectedCount={selectedEndpointIds.size}
          onClose={() => setIsJsonModalOpen(false)}
        />
      ) : null}
    </div>
  );
}

function SetupPanel({
  apiDocsUrl,
  error,
  loading,
  onApiDocsUrlChange,
  onSubmit,
  onCancel,
}: {
  apiDocsUrl: string;
  error: string | null;
  loading: boolean;
  onApiDocsUrlChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  return (
    <section className="glass-card overflow-hidden rounded-[30px] border border-white/10 shadow-[0_18px_55px_rgba(2,6,23,0.28)]">
      <div className="border-b border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.15),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-5 py-5 sm:px-6">
        <div className="space-y-2">
          <span className="inline-flex rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-200">
            Initial Setup
          </span>
          <h2 className="text-2xl font-semibold text-white">Nhập URL API Docs JSON</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-400">
            URL này sẽ được lưu trong local storage. Sau khi lưu xong, refresh trang sẽ vào
            thẳng danh sách API và không hiện lại màn hình nhập trừ khi anh bấm `Đổi URL`
            hoặc `Thoát`.
          </p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <input
          value={apiDocsUrl}
          onChange={(event) => onApiDocsUrlChange(event.target.value)}
          placeholder="https://api.gen-hub.dev/api-docs-json"
          className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-400/50"
        />

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-full bg-teal-400 px-5 text-sm font-medium text-slate-950 shadow-[0_14px_34px_rgba(20,184,166,0.32)] transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu và tải dữ liệu
          </button>

          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-slate-100 transition hover:border-white/16 hover:bg-white/[0.08]"
            >
              Hủy
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StatePanel({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex min-h-[300px] flex-col items-center justify-center rounded-[32px] border border-white/10 px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.06] text-teal-200">
        {icon}
      </div>
      <h2 className="mt-5 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
