"use client";

import { useEffect, useState } from "react";
import type { ModerationRule } from "@/lib/types";
import { IconTrash } from "../icons";

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
    <div className="admin-panel-group">
      <h4>Auto-moderation rules</h4>
      <p className="muted">
        When a new submission matches a rule, it is approved or rejected
        automatically without waiting for you. Reject rules take priority.
      </p>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Enable auto-moderation on this map
          </label>

          {rules.length > 0 && (
            <ul className="admin-rules-list">
              {rules.map((r) => (
                <li key={r.id} className="admin-rule">
                  <span className={`admin-rule-action ${r.action}`}>
                    {r.action === "approve" ? "Approve" : "Reject"}
                  </span>
                  <span className="muted">{FIELD_LABELS[r.field]}</span>
                  <code className="admin-rule-pattern">{r.pattern}</code>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => removeRule(r.id)}
                    aria-label="Remove rule"
                  >
                    <IconTrash size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="admin-rules-add">
            <select value={newAction} onChange={(e) => setNewAction(e.target.value as "approve" | "reject")}>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
            </select>
            <select value={newField} onChange={(e) => setNewField(e.target.value as ModerationRule["field"])}>
              {(Object.keys(FIELD_LABELS) as ModerationRule["field"][]).map((f) => (
                <option key={f} value={f}>
                  {FIELD_LABELS[f]}
                </option>
              ))}
            </select>
            <input
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRule();
                }
              }}
              placeholder="Text to match, e.g. casino"
            />
            <button type="button" className="action-btn2" onClick={addRule}>
              Add rule
            </button>
          </div>

          {error && <p className="auth-error">{error}</p>}
          {notice && (
            <p className="muted" style={{ color: "var(--green)" }}>{notice}</p>
          )}
          <div className="admin-row-actions">
            <button type="button" className="action-btn" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save rules"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}