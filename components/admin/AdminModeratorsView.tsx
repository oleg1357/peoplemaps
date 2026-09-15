"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MapRoleEntry } from "@/lib/api-client";
import { IconUser } from "../icons";
import {
  MAP_ROLE_TYPES,
  ROLE_CAPABILITIES,
  TEAM_GRANTABLE_CAPABILITIES,
  CAPABILITY_INFO,
  capsMatchRole,
  type MapCapability,
  type MapRoleType,
} from "@/lib/roles";

const PRESET_LABELS: Record<string, string> = {
  viewer: "Viewer",
  reviewer: "Reviewer",
  moderator: "Moderator",
};

function rolePresetForCaps(caps: readonly MapCapability[]): MapRoleType | null {
  for (const role of MAP_ROLE_TYPES) {
    if (capsMatchRole(caps, role)) return role;
  }
  return null;
}

// Minimal native checkbox — the project has no <Checkbox> primitive.
function CapabilityCheckbox({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2 rounded p-1.5 text-sm hover:bg-muted/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
      <span className="leading-tight">{children}</span>
    </label>
  );
}

export default function AdminModeratorsView({
  moderators,
  loadingModerators,
  moderatorBusy,
  moderatorError,
  moderatorNotice,
  onAddModerator,
  onRemoveModerator,
  onUpdateModerator,
}: {
  moderators: MapRoleEntry[];
  loadingModerators: boolean;
  moderatorBusy: boolean;
  moderatorError: string;
  moderatorNotice: string;
  onAddModerator: (
    email: string,
    role: MapRoleType,
    capabilities?: MapCapability[]
  ) => void;
  onRemoveModerator: (userId: string) => void;
  onUpdateModerator: (
    userId: string,
    patch: { role: MapRoleType; capabilities: MapCapability[] }
  ) => Promise<void>;
}) {
  // ---- Invite form ----
  const [inviteRole, setInviteRole] = useState<MapRoleType>("moderator");
  const [inviteCaps, setInviteCaps] = useState<MapCapability[]>([
    ...ROLE_CAPABILITIES["moderator"],
  ]);
  const [inviteEmailDraft, setInviteEmailDraft] = useState("");

  function handleInviteRoleChange(next: MapRoleType) {
    setInviteRole(next);
    setInviteCaps([...ROLE_CAPABILITIES[next]]);
  }

  function toggleInviteCap(cap: MapCapability) {
    setInviteCaps((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  }

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmailDraft.trim()) return;
    // Detect if the user just picked a vanilla preset — skip the explicit caps
    // array so the backend falls back to the role preset (cleaner docs).
    const presetRole = rolePresetForCaps(inviteCaps);
    const caps =
      presetRole === inviteRole ? undefined : [...inviteCaps].sort();
    onAddModerator(inviteEmailDraft, inviteRole, caps);
    setInviteEmailDraft("");
  }

  // ---- Per-member drafts ----
  const [drafts, setDrafts] = useState<
    Record<
      string,
      { role: MapRoleType; caps: MapCapability[]; saving: boolean }
    >
  >({});

  function getDraft(m: MapRoleEntry) {
    if (drafts[m.userId]) return drafts[m.userId]!;
    return {
      role: m.role ?? "moderator",
      caps: m.capabilities
        ? [...m.capabilities]
        : [...ROLE_CAPABILITIES[m.role ?? "moderator"]],
      saving: false,
    };
  }

  function isDirty(m: MapRoleEntry) {
    const d = getDraft(m);
    if (d.role !== (m.role ?? "moderator")) return true;
    const origCaps = m.capabilities
      ? [...m.capabilities].sort()
      : [...ROLE_CAPABILITIES[m.role ?? "moderator"]].sort();
    const curCaps = [...d.caps].sort();
    return (
      origCaps.length !== curCaps.length ||
      origCaps.some((c, i) => c !== curCaps[i])
    );
  }

  function setDraftRole(userId: string, role: MapRoleType) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...getDraft({ userId, role } as MapRoleEntry),
        role,
        caps: [...ROLE_CAPABILITIES[role]],
      },
    }));
  }

  function toggleDraftCap(userId: string, cap: MapCapability) {
    setDrafts((prev) => {
      const d = prev[userId] ?? getDraft({ userId } as MapRoleEntry);
      return {
        ...prev,
        [userId]: {
          ...d,
          caps: d.caps.includes(cap)
            ? d.caps.filter((c) => c !== cap)
            : [...d.caps, cap],
        },
      };
    });
  }

  async function saveMember(m: MapRoleEntry) {
    const d = getDraft(m);
    setDrafts((prev) => ({ ...prev, [m.userId]: { ...d, saving: true } }));
    try {
      await onUpdateModerator(m.userId, {
        role: d.role,
        capabilities: [...d.caps].sort(),
      });
    } finally {
      setDrafts((prev) => ({
        ...prev,
        [m.userId]: { ...d, saving: false },
      }));
    }
  }

  function discardDraft(userId: string) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  return (
    <div className="mt-4 space-y-6">
      <div>
        <h3 className="mb-1 font-heading text-lg font-semibold">
          Team capabilities
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Invite collaborators and grant them exactly the capabilities they
          need. Each member can have any combination of data, export, moderation,
          edit, reporting, and staff permissions. The map owner and global admins
          always have full access.
        </p>
      </div>

      {/* ------- Invite form ------- */}
      <form onSubmit={submitInvite} className="space-y-3">
        <Label className="text-sm font-medium">Invite by email</Label>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            type="email"
            placeholder="user@example.com"
            className="w-full sm:w-64"
            value={inviteEmailDraft}
            onChange={(e) => setInviteEmailDraft(e.target.value)}
            disabled={moderatorBusy}
          />

          <div className="flex items-center gap-2">
            <Label className="whitespace-nowrap text-xs text-muted-foreground">
              Role preset
            </Label>
            <Select
              value={inviteRole}
              onValueChange={(v) => handleInviteRoleChange(v as MapRoleType)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAP_ROLE_TYPES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {PRESET_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={moderatorBusy || !inviteEmailDraft.trim()}>
            {moderatorBusy ? "Inviting…" : "Invite"}
          </Button>
        </div>

        {/* Capability checkboxes for the invite */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {TEAM_GRANTABLE_CAPABILITIES.map((cap) => {
            const info = CAPABILITY_INFO[cap];
            return (
              <CapabilityCheckbox
                key={cap}
                checked={inviteCaps.includes(cap)}
                onChange={() => toggleInviteCap(cap)}
                disabled={moderatorBusy}
              >
                <span className="font-medium">{info.label}</span>
                <span className="ml-1 text-xs text-muted-foreground">
                  {info.description}
                </span>
              </CapabilityCheckbox>
            );
          })}
        </div>
      </form>

      {/* ------- Error / notice ------- */}
      {moderatorError && (
        <p className="text-sm text-destructive">{moderatorError}</p>
      )}
      {moderatorNotice && (
        <p className="text-sm text-emerald-600">{moderatorNotice}</p>
      )}

      {/* ------- Existing members ------- */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-muted-foreground">
          Current team members
        </h4>
        {loadingModerators ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : moderators.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No team members yet. Invite someone above.
          </p>
        ) : (
          <div className="space-y-4">
            {moderators.map((m) => {
              const d = getDraft(m);
              const dirty = isDirty(m);
              const preset = rolePresetForCaps(d.caps);
              return (
                <div
                  key={m.userId}
                  className="rounded border border-border/60 bg-muted/30 p-4 space-y-3"
                >
                  {/* Header row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        <IconUser size={14} />
                      </span>
                      <span className="text-sm font-medium">
                        {m.displayName || m.email || m.userId.slice(0, 8)}
                      </span>
                      {m.email && m.displayName && (
                        <span className="text-xs text-muted-foreground">
                          {m.email}
                        </span>
                      )}
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      {preset && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {PRESET_LABELS[preset]}
                        </span>
                      )}
                      {!preset && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Custom
                        </span>
                      )}

                      {/* Inline role select */}
                      <Select
                        value={d.role}
                        onValueChange={(v) =>
                          setDraftRole(m.userId, v as MapRoleType)
                        }
                      >
                        <SelectTrigger className="w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MAP_ROLE_TYPES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {PRESET_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Capability matrix */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
                    {TEAM_GRANTABLE_CAPABILITIES.map((cap) => {
                      const info = CAPABILITY_INFO[cap];
                      return (
                        <CapabilityCheckbox
                          key={cap}
                          checked={d.caps.includes(cap)}
                          onChange={() => toggleDraftCap(m.userId, cap)}
                        >
                          <span className="font-medium">{info.label}</span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            {info.description}
                          </span>
                        </CapabilityCheckbox>
                      );
                    })}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-2 pt-1">
                    {dirty ? (
                      <>
                        <Button
                          size="sm"
                          disabled={d.saving}
                          onClick={() => saveMember(m)}
                        >
                          {d.saving ? "Saving…" : "Save changes"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={d.saving}
                          onClick={() => discardDraft(m.userId)}
                        >
                          Discard
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Saved
                      </span>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      className="ml-auto"
                      onClick={() => onRemoveModerator(m.userId)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
