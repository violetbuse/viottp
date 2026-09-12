import { useState } from "react";
import { Send } from "lucide-react";
import { Button, Select, Input } from "../../components/ui";
import { CodeEditor } from "../../components/CodeEditor";
import { KeyValueEditor } from "./KeyValueEditor";
import { HTTP_METHODS } from "../../lib/types";
import type { BodyType, KeyValueEntry } from "../../lib/types";
import type { TabState } from "../../stores/tabs-store";
import { useTabsStore } from "../../stores/tabs-store";
import { useEnvironmentsStore } from "../../stores/environments-store";
import { useVariablesStore } from "../../stores/variables-store";
import { findUnresolvedVariablesMany, resolveVariables } from "../../lib/interpolate";
import { defaultContentTypeFor, hasContentTypeHeader, toCurl, withAutoContentType } from "../../lib/format";

const SECTIONS = ["Headers", "Query", "Body"] as const;
type Section = (typeof SECTIONS)[number];

export function HttpRequestForm({ tab }: { tab: TabState }) {
  const [section, setSection] = useState<Section>("Headers");
  const updateDraft = useTabsStore((s) => s.updateDraft);
  const sendHttp = useTabsStore((s) => s.sendHttp);
  const activeEnvironmentId = useEnvironmentsStore((s) => s.activeEnvironmentId);
  const mergedMap = useVariablesStore((s) => s.mergedMap);

  const enabledHeaderCount = tab.draft.headers.filter((h) => h.enabled && h.key.trim()).length;
  const enabledQueryCount = tab.draft.queryParams.filter((q) => q.enabled && q.key.trim()).length;

  async function handleSend() {
    const vars = mergedMap(activeEnvironmentId);
    const resolvedUrl = resolveVariables(tab.draft.url, vars);
    const resolvedHeaders: KeyValueEntry[] = tab.draft.headers.map((h) => ({
      ...h,
      key: resolveVariables(h.key, vars),
      value: resolveVariables(h.value, vars),
    }));
    const resolvedBody = resolveVariables(tab.draft.body, vars);
    const finalHeaders = withAutoContentType(resolvedHeaders, tab.draft.bodyType);

    const unresolved = findUnresolvedVariablesMany(
      [tab.draft.url, tab.draft.body, ...tab.draft.headers.map((h) => h.value)],
      vars,
    );
    if (unresolved.length > 0) {
      const proceed = window.confirm(
        `Unresolved variable${unresolved.length > 1 ? "s" : ""}: ${unresolved.join(", ")}\n\nSend anyway?`,
      );
      if (!proceed) return;
    }

    const fullUrl = buildUrlWithQuery(resolvedUrl, tab.draft.queryParams, vars);
    await sendHttp(tab.id, { url: fullUrl, headers: finalHeaders, body: resolvedBody }, activeEnvironmentId);
  }

  function copyAsCurl() {
    const vars = mergedMap(activeEnvironmentId);
    const resolvedUrl = resolveVariables(tab.draft.url, vars);
    const resolvedHeaders = tab.draft.headers.map((h) => ({ ...h, value: resolveVariables(h.value, vars) }));
    const curl = toCurl({
      method: tab.draft.method,
      url: resolvedUrl,
      headers: withAutoContentType(resolvedHeaders, tab.draft.bodyType),
      query_params: tab.draft.queryParams,
      body: tab.draft.bodyType === "none" ? null : resolveVariables(tab.draft.body, vars),
    });
    navigator.clipboard.writeText(curl);
  }

  const autoContentType = defaultContentTypeFor(tab.draft.bodyType);
  const showAutoContentTypeHint = autoContentType !== null && !hasContentTypeHeader(tab.draft.headers);

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <Select
          value={tab.draft.method}
          onChange={(e) => updateDraft(tab.id, { method: e.target.value })}
          className="w-28"
        >
          {HTTP_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Input
          value={tab.draft.url}
          onChange={(e) => updateDraft(tab.id, { url: e.target.value })}
          placeholder="https://api.example.com/{{path}}?key={{apiKey}}"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
              handleSend();
            }
          }}
          className="flex-1"
        />
        <Button variant="primary" onClick={handleSend} disabled={tab.httpLoading || !tab.draft.url}>
          <Send size={14} /> {tab.httpLoading ? "Sending…" : "Send"}
        </Button>
      </div>

      <div className="flex items-center justify-between border-b border-line">
        <div className="flex gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                section === s
                  ? "border-violet-500 text-ink"
                  : "border-transparent text-ink-3 hover:text-ink-2"
              }`}
            >
              {s}
              {s === "Headers" && enabledHeaderCount > 0 ? ` (${enabledHeaderCount})` : ""}
              {s === "Query" && enabledQueryCount > 0 ? ` (${enabledQueryCount})` : ""}
            </button>
          ))}
        </div>
        <button
          onClick={copyAsCurl}
          className="px-2 py-1 text-[11px] text-ink-3 hover:text-ink-2"
        >
          Copy as cURL
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {section === "Headers" && (
          <div className="flex flex-col gap-2">
            <KeyValueEditor
              entries={tab.draft.headers}
              onChange={(headers) => updateDraft(tab.id, { headers })}
              keyPlaceholder="Header"
            />
            {showAutoContentTypeHint && (
              <p className="text-[11px] text-ink-3">
                <span className="text-violet-400">Content-Type: {autoContentType}</span> will be
                sent automatically for this body type. Add your own Content-Type header above to
                override it.
              </p>
            )}
          </div>
        )}
        {section === "Query" && (
          <KeyValueEditor
            entries={tab.draft.queryParams}
            onChange={(queryParams) => updateDraft(tab.id, { queryParams })}
            keyPlaceholder="Param"
          />
        )}
        {section === "Body" && (
          <div className="flex h-full flex-col gap-2">
            <Select
              value={tab.draft.bodyType}
              onChange={(e) => updateDraft(tab.id, { bodyType: e.target.value as BodyType })}
              className="w-32"
            >
              <option value="none">No body</option>
              <option value="json">JSON</option>
              <option value="text">Text</option>
              <option value="form">Form</option>
            </Select>
            {tab.draft.bodyType !== "none" && (
              <div className="min-h-[160px] flex-1">
                <CodeEditor
                  value={tab.draft.body}
                  onChange={(body) => updateDraft(tab.id, { body })}
                  language={tab.draft.bodyType === "json" ? "json" : "text"}
                  placeholder={tab.draft.bodyType === "json" ? "{}" : undefined}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function buildUrlWithQuery(url: string, params: KeyValueEntry[], vars: Map<string, string>): string {
  const enabled = params.filter((p) => p.enabled && p.key.trim().length > 0);
  if (enabled.length === 0) return url;
  const [base, existingQuery] = url.split("?");
  const search = new URLSearchParams(existingQuery ?? "");
  for (const p of enabled) {
    search.append(resolveVariables(p.key, vars), resolveVariables(p.value, vars));
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}
