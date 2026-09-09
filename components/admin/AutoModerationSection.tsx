"use client";

import { useEffect, useState } from "react";
import type { ModerationRule } from "@/lib/types";
import { IconTrash } from "../icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { selectInputCls } from "../AdminPanel";

const FIELD_LABELS: Record<ModerationRule["field"], string> = {
  any: "Any text",
  name: "Spot name",
  tip: "Insider tip",
  tags: "Tags",
};

export default function AutoModerationSection({
  mapId,
  backendLive,
}: {
  mapId: string;
  backendLive: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<ModerationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newAction, setNewAction] = useState<ModerationRule["action"]>("reject");
  const [newField, setNewField] = useState<ModerationRule["field"]>("any");
  const [newPattern, setNewPattern] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!backendLive) {
      setLoading(false);
      return;
    }
    import("@/lib/api-client").then(({ fetchAdminRules }) =>
      fetchAdminRules(mapId)
        .then((res) => {
          if (!active) return;
          const r = res?.rules;
          setEnabled(r?.enabled ?? false);
          setRules(r?.rules ?? []);
        })
        .catch(() => setError("Could not load auto-moderation rules."))
        .finally(() => active && setLoading(false))
    );
    return () => {
      active = false;
    };
  }, [mapId, backendLive]);

  const addRule = () => {
    const pattern = newPattern.trim().slice(0, 60);
    if (!pattern) return;
    setRules((prev) => [
      ...prev,
      { id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2), action: newAction, field: newField, pattern },
    ]);
    setNewPattern("");
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const save = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { saveAdminRules } = await import("@/lib/api-client");
      const res = await saveAdminRules(mapId, enabled, rules);
      if (res?.ok) setNotice("Rules saved.");
      else setError("Failed to save rules.");
    } catch (e) {
      setError((e as Error).message || "Failed to save rules.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <div className="mb-1 text-xs font-semibold tracking-[0.05em] text-muted-foreground uppercase">
        Auto-moderation rules
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        When a new submission matches a rule, it is approved or rejected
        automatically without waiting for you. Reject rules take priority.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Enable auto-moderation on this map</span>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="Enable auto-moderation on this map"
            />
          </div>

          {rules.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {rules.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm"
                >
                  {r.action === "approve" ? (
                    <Badge className="bg-emerald-600/10 text-emerald-700 uppercase dark:bg-emerald-400/10 dark:text-emerald-300">
                      Approve
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="uppercase">
                      Reject
                    </Badge>
                  )}
                  <span className="text-muted-foreground">{FIELD_LABELS[r.field]}</span>
                  <code className="rounded border bg-muted px-2 py-0.5 font-mono text-[13px]">
                    {r.pattern}
                  </code>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={() => removeRule(r.id)}
                    aria-label="Remove rule"
                  >
                    <IconTrash size={15} />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              className={`${selectInputCls} w-32`}
              value={newAction}
              onChange={(e) => setNewAction(e.target.value as "approve" | "reject")}
            >
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
            </select>
            <select
              className={`${selectInputCls} w-36`}
              value={newField}
              onChange={(e) => setNewField(e.target.value as ModerationRule["field"])}
            >
              {(Object.keys(FIELD_LABELS) as ModerationRule["field"][]).map((f) => (
                <option key={f} value={f}>
                  {FIELD_LABELS[f]}
                </option>
              ))}
            </select>
            <Input
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRule();
                }
              }}
              placeholder="Text to match, e.g. casino"
              className="min-w-48 flex-1"
            />
            <Button type="button" size="sm" variant="outline" onClick={addRule}>
              Add rule
            </Button>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {notice && <p className="mt-3 text-sm text-green-dark">{notice}</p>}
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" size="sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save rules"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}