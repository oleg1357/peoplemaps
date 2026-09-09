"use client";

import { useState } from "react";
import type { MapSettingsInput } from "@/lib/api-client";
import {
  uploadCoverImage,
  removeCoverImage,
} from "@/lib/api-client";
import { backendLive } from "@/lib/api-client";
import {
  MARKER_COLORS,
  DEFAULT_MARKER,
  DEFAULT_ACCENT,
  getMarkerColor,
} from "@/lib/markers";
import { IconTrash } from "../icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MarkerPicker, AdminField, selectInputCls } from "../AdminPanel";
import { coverImageUrl } from "@/sanity/lib/images";
import AutoModerationSection from "./AutoModerationSection";
import type { MapDocument } from "@/lib/types";

const DEFAULT_BASE = { lat: 55.6761, lng: 12.5683 };

function SettingsGroup({
  title,
  children,
  cols = 2,
}: {
  title: string;
  children: React.ReactNode;
  cols?: 1 | 2;
}) {
  return (
    <div
      className={`mt-3 grid gap-2.5 rounded-lg border bg-muted/40 p-4 ${
        cols === 1 ? "grid-cols-1" : "grid-cols-2"
      }`}
    >
      <div className="col-span-full mb-1 text-xs font-semibold tracking-[0.05em] text-muted-foreground uppercase">
        {title}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

export default function AdminSettingsView({
  draft,
  setDraft,
  savingSettings,
  settingsSaved,
  settingsError,
  onSubmit,
  onDeleteMap,
  activeMap,
}: {
  draft: MapSettingsInput;
  setDraft: (d: MapSettingsInput) => void;
  savingSettings: boolean;
  settingsSaved: boolean;
  settingsError: string;
  onSubmit: (e: React.FormEvent) => void;
  onDeleteMap: () => void;
  activeMap: MapDocument | null;
}) {
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverMsg, setCoverMsg] = useState("");

  const coverUrl = activeMap?.coverImage ? coverImageUrl(activeMap.coverImage) : null;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeMap) return;
    setCoverUploading(true);
    setCoverMsg("");
    try {
      const res = await uploadCoverImage(activeMap._id, file);
      setCoverMsg(res?.ok ? "Cover image uploaded." : "Upload failed.");
    } catch (err) {
      setCoverMsg((err as Error).message || "Upload failed.");
    } finally {
      setCoverUploading(false);
      e.target.value = "";
    }
  };

  const handleCoverRemove = async () => {
    if (!activeMap) return;
    setCoverMsg("");
    try {
      const res = await removeCoverImage(activeMap._id);
      setCoverMsg(res?.ok ? "Cover image removed." : "Remove failed.");
    } catch (err) {
      setCoverMsg((err as Error).message || "Remove failed.");
    }
  };

  return (
    <>
    <form className="mt-4" onSubmit={onSubmit}>
      <h3 className="mb-1 font-heading text-lg font-semibold">Map settings</h3>
      <SettingsGroup title="Cover image">
        <div className="col-span-full flex flex-wrap items-center gap-3">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Cover"
              className="h-20 w-30 rounded-lg border object-cover"
            />
          ) : (
            <span className="text-sm text-muted-foreground">No cover image yet.</span>
          )}
          {backendLive && (
            <>
              <label
                className={`${buttonVariants({
                  variant: "outline",
                  size: "sm",
                })} cursor-pointer`}
              >
                {coverUploading ? "Uploading…" : coverUrl ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={coverUploading}
                  onChange={handleCoverUpload}
                />
              </label>
              {coverUrl && (
                <Button type="button" size="sm" variant="outline" onClick={handleCoverRemove}>
                  Remove
                </Button>
              )}
            </>
          )}
        </div>
        {coverMsg && (
          <p className="col-span-full text-sm text-muted-foreground">{coverMsg}</p>
        )}
      </SettingsGroup>

      <SettingsGroup title="Basics">
        <AdminField label="Title">
          <Input
            value={draft.title ?? ""}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </AdminField>
        <AdminField label="Visibility">
          <select
            className={selectInputCls}
            value={draft.isPublic ?? "public"}
            onChange={(e) =>
              setDraft({
                ...draft,
                isPublic: e.target.value as "public" | "private",
              })
            }
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </AdminField>
        <AdminField label="Description">
          <Input
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </AdminField>
        <AdminField label="Accent color">
          <div className="marker-picker-colors">
            {MARKER_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`swatch ${draft.accentColor === c ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => setDraft({ ...draft, accentColor: c })}
              />
            ))}
            <input
              type="color"
              value={getMarkerColor(draft.accentColor ?? DEFAULT_ACCENT)}
              onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })}
              title="Custom color"
            />
          </div>
        </AdminField>
      </SettingsGroup>

      <div className="mt-3 rounded-lg border bg-muted/40 p-4">
        <MarkerPicker
          emoji={draft.defaultMarker ?? DEFAULT_MARKER.emoji}
          color={draft.defaultMarkerColor ?? DEFAULT_MARKER.color}
          onEmoji={(e) => setDraft({ ...draft, defaultMarker: e })}
          onColor={(c) => setDraft({ ...draft, defaultMarkerColor: c })}
        />
      </div>

      <SettingsGroup title="Behavior">
        <AdminField label="Default map center (lat)">
          <Input
            type="number"
            step="any"
            value={draft.baseCenter?.lat ?? DEFAULT_BASE.lat}
            onChange={(e) =>
              setDraft({
                ...draft,
                baseCenter: {
                  lat: Number(e.target.value),
                  lng: draft.baseCenter?.lng ?? DEFAULT_BASE.lng,
                },
              })
            }
          />
        </AdminField>
        <AdminField label="Default map center (lng)">
          <Input
            type="number"
            step="any"
            value={draft.baseCenter?.lng ?? DEFAULT_BASE.lng}
            onChange={(e) =>
              setDraft({
                ...draft,
                baseCenter: {
                  lat: draft.baseCenter?.lat ?? DEFAULT_BASE.lat,
                  lng: Number(e.target.value),
                },
              })
            }
          />
        </AdminField>
        <AdminField label="Default zoom">
          <Input
            type="number"
            min={3}
            max={18}
            value={draft.baseZoom ?? 12}
            onChange={(e) => setDraft({ ...draft, baseZoom: Number(e.target.value) })}
          />
        </AdminField>
        <AdminField label="Max photos per spot (0-12)">
          <Input
            type="number"
            min={0}
            max={12}
            value={draft.maxPhotosPerSpot ?? 6}
            onChange={(e) =>
              setDraft({ ...draft, maxPhotosPerSpot: Number(e.target.value) })
            }
          />
        </AdminField>
        <div className="col-span-full">
          <ToggleRow
            checked={draft.requireApproval ?? true}
            onCheckedChange={(c) => setDraft({ ...draft, requireApproval: c })}
            label="Require your approval for new spots"
          />
        </div>
        <AdminField label="Who can add spots">
          <select
            className={selectInputCls}
            value={draft.collaborationMode ?? "loggedIn"}
            onChange={(e) =>
              setDraft({
                ...draft,
                collaborationMode: e.target.value as
                  | "anyone"
                  | "loggedIn"
                  | "invitedOnly",
              })
            }
          >
            <option value="anyone">Anyone (no login required)</option>
            <option value="loggedIn">Logged-in users</option>
            <option value="invitedOnly">Owner &amp; moderators only</option>
          </select>
        </AdminField>
      </SettingsGroup>

      <SettingsGroup title="Discovery">
        <AdminField label="Category">
          <select
            className={selectInputCls}
            value={draft.category ?? ""}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          >
            <option value="">No category</option>
            <option value="food">Food &amp; drink</option>
            <option value="sights">Sightseeing</option>
            <option value="shopping">Shopping</option>
            <option value="outdoors">Outdoors</option>
            <option value="nightlife">Nightlife</option>
            <option value="arts">Arts &amp; culture</option>
            <option value="sports">Sports</option>
            <option value="other">Other</option>
          </select>
        </AdminField>
        <AdminField label="Tags">
          <Input
            value={draft.tags ?? ""}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
            placeholder="e.g. hidden gems, family friendly, dog friendly"
          />
        </AdminField>
      </SettingsGroup>

      <SettingsGroup title="Content toggles" cols={1}>
        <ToggleRow
          checked={draft.allowReviews ?? true}
          onCheckedChange={(c) => setDraft({ ...draft, allowReviews: c })}
          label="Allow visitors to add reviews"
        />
        <ToggleRow
          checked={draft.allowComments ?? true}
          onCheckedChange={(c) => setDraft({ ...draft, allowComments: c })}
          label="Allow visitors to comment on reviews"
        />
        <ToggleRow
          checked={draft.allowPhotos ?? true}
          onCheckedChange={(c) => setDraft({ ...draft, allowPhotos: c })}
          label="Allow visitors to upload photos"
        />
        <ToggleRow
          checked={draft.enableClustering ?? false}
          onCheckedChange={(c) => setDraft({ ...draft, enableClustering: c })}
          label="Cluster nearby markers on the map"
        />
      </SettingsGroup>

      <SettingsGroup title="Contact &amp; links">
        <AdminField label="Contact email">
          <Input
            type="email"
            value={draft.contactEmail ?? ""}
            onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
            placeholder="hello@example.com"
          />
        </AdminField>
        <AdminField label="Website">
          <Input
            type="url"
            value={draft.website ?? ""}
            onChange={(e) => setDraft({ ...draft, website: e.target.value })}
            placeholder="https://example.com"
          />
        </AdminField>
      </SettingsGroup>

      <SettingsGroup title="Text for visitors" cols={1}>
        <AdminField label="Welcome message">
          <Textarea
            rows={3}
            value={draft.welcomeMessage ?? ""}
            onChange={(e) => setDraft({ ...draft, welcomeMessage: e.target.value })}
            placeholder="Short banner shown on the map, e.g. “Help keep this map fresh!”"
          />
        </AdminField>
        <AdminField label="Add-spot instructions">
          <Textarea
            rows={2}
            value={draft.submissionNote ?? ""}
            onChange={(e) => setDraft({ ...draft, submissionNote: e.target.value })}
            placeholder="Tip shown in the add-spot form, e.g. “Please include opening hours.”"
          />
        </AdminField>
      </SettingsGroup>

      {settingsError && <p className="mt-3 text-sm text-destructive">{settingsError}</p>}
      {settingsSaved && (
        <p className="mt-3 text-sm text-green-dark">Settings saved.</p>
      )}
      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" disabled={savingSettings}>
          {savingSettings ? "Saving…" : "Save settings"}
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-destructive/35 bg-destructive/5 p-4">
        <div>
          <strong className="text-destructive">Danger zone</strong>
          <p className="mt-1 text-sm text-muted-foreground">
            Delete the map, all its spots, reviews, photos and comments. This
            cannot be undone.
          </p>
        </div>
        <Button type="button" variant="destructive" onClick={onDeleteMap}>
          <IconTrash size={15} /> Delete map
        </Button>
      </div>
    </form>

    {backendLive && activeMap && (
      <div className="mt-4">
        <AutoModerationSection mapId={activeMap._id} backendLive={backendLive} />
      </div>
    )}
    </>
  );
}