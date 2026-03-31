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
const STORAGE_SHOW_MISSING_ACTUAL_RESPONSE_ALERT_KEY =
  "genhub-api-json.show-missing-actual-response-alert";
const DEFAULT_ALL_TAGS_OPEN = false;
const DEFAULT_SHOW_MISSING_ACTUAL_RESPONSE_ALERT = false;
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
  const [showMissingActualResponseAlert, setShowMissingActualResponseAlert] = useState(
    DEFAULT_SHOW_MISSING_ACTUAL_RESPONSE_ALERT,
  );
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedApiDocsUrl = window.localStorage.getItem(STORAGE_API_DOCS_URL_KEY) ?? "";
    const savedAllTagsOpen = window.localStorage.getItem(STORAGE_ALL_TAGS_OPEN_KEY);
    const savedShowMissingActualResponseAlert = window.localStorage.getItem(
      STORAGE_SHOW_MISSING_ACTUAL_RESPONSE_ALERT_KEY,
    );
    const initialAllTagsOpen =
      savedAllTagsOpen === null ? DEFAULT_ALL_TAGS_OPEN : savedAllTagsOpen === "true";
    const initialShowMissingActualResponseAlert =
      savedShowMissingActualResponseAlert === null
        ? DEFAULT_SHOW_MISSING_ACTUAL_RESPONSE_ALERT
        : savedShowMissingActualResponseAlert === "true";

    setAllTagsOpen(initialAllTagsOpen);
    setShowMissingActualResponseAlert(initialShowMissingActualResponseAlert);

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

  function handleToggleMissingActualResponseAlert(checked: boolean) {
    setShowMissingActualResponseAlert(checked);
    window.localStorage.setItem(
      STORAGE_SHOW_MISSING_ACTUAL_RESPONSE_ALERT_KEY,
      String(checked),
    );
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
        <section className="glass-card rounded-[28px] border border-[var(--border)] p-6 shadow-[var(--shadow-panel)]">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-48 rounded-full bg-[var(--surface-muted)]" />
            <div className="h-12 rounded-2xl bg-[var(--surface-muted)]" />
            <div className="h-11 w-40 rounded-full bg-[var(--surface-muted)]" />
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
            showMissingActualResponseAlert={showMissingActualResponseAlert}
            onSearchChange={setSearchQuery}
            onSelectAll={handleSelectAllVisible}
            onClearAll={handleClearAll}
            onExtract={handleExtract}
            onToggleAllTagsOpen={handleToggleAllTagsOpen}
            onToggleMissingActualResponseAlert={handleToggleMissingActualResponseAlert}
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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
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
                  showMissingActualResponseAlert={showMissingActualResponseAlert}
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
    <section className="glass-card overflow-hidden rounded-[30px] border border-[var(--border)] shadow-[var(--shadow-panel)]">
      <div className="border-b border-[var(--border)] bg-[var(--sidebar-bg)] px-5 py-5 sm:px-6">
        <div className="space-y-2">
          <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Initial Setup
          </span>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">Nhập URL API Docs JSON</h2>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <input
          value={apiDocsUrl}
          onChange={(event) => onApiDocsUrlChange(event.target.value)}
          placeholder="https://api.gen-hub.dev/api-docs-json"
          className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
        />

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu và tải dữ liệu
          </button>

          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-5 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)]"
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
    <div className="panel flex min-h-[300px] flex-col items-center justify-center rounded-[32px] border border-[var(--border)] px-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--accent)]">
        {icon}
      </div>
      <h2 className="mt-5 text-xl font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
