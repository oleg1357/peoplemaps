"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminField, selectInputCls } from "../AdminPanel";

export default function AdminCreateMap({
  createTitle,
  createDesc,
  createPublic,
  createError,
  createBusy,
  onSubmit,
  setCreateTitle,
  setCreateDesc,
  setCreatePublic,
  isPaid,
  publicMapCount,
  freePublicLimit,
  upgradeBusy,
  onUpgrade,
  manageBusy,
  onManage,
}: {
  createTitle: string;
  createDesc: string;
  createPublic: "public" | "private";
  createError: string;
  createBusy: boolean;
  onSubmit: (e: React.FormEvent) => void;
  setCreateTitle: (v: string) => void;
  setCreateDesc: (v: string) => void;
  setCreatePublic: (v: "public" | "private") => void;
  isPaid: boolean;
  publicMapCount: number;
  freePublicLimit: number;
  upgradeBusy: boolean;
  onUpgrade: () => void;
  manageBusy: boolean;
  onManage: () => void;
}) {
  const remaining = Math.max(0, freePublicLimit - publicMapCount);
  return (
    <form
      className="mt-4 flex max-w-xl flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm"
      onSubmit={onSubmit}
    >
      <h3 className="font-heading text-base font-semibold">Create a new map</h3>
      <AdminField label="Title">
        <Input
          value={createTitle}
          onChange={(e) => setCreateTitle(e.target.value)}
          placeholder="e.g. Best Coffee in Copenhagen"
        />
      </AdminField>
      <AdminField label="Description (optional)">
        <Input
          value={createDesc}
          onChange={(e) => setCreateDesc(e.target.value)}
          placeholder="What is this map about?"
        />
      </AdminField>
      <AdminField label="Visibility">
        <select
          className={selectInputCls}
          value={createPublic}
          onChange={(e) => setCreatePublic(e.target.value as "public" | "private")}
        >
          <option value="public">Public — anyone can view</option>
          {isPaid ? (
            <option value="private">Private — owner only</option>
          ) : (
            <option value="private" disabled>
              Private — owner only (Pro)
            </option>
          )}
        </select>
      </AdminField>

      {!isPaid && (
        <div className="flex flex-col items-start gap-2 rounded-lg border bg-muted/40 px-3.5 py-3 text-sm">
          <span>
            Free plan: {publicMapCount} of {freePublicLimit} public maps used
            {remaining > 0 ? ` (${remaining} left)` : ""}.
          </span>
          <Button type="button" size="sm" disabled={upgradeBusy} onClick={onUpgrade}>
            {upgradeBusy ? "Opening checkout…" : "Upgrade to Pro"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Unlimited maps · private maps · priority support
          </span>
        </div>
      )}
      {isPaid && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-green bg-muted/40 px-3.5 py-3 text-sm text-green-dark">
          <span>Pro plan — unlimited public and private maps.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={manageBusy}
            onClick={onManage}
          >
            {manageBusy ? "Opening…" : "Manage subscription"}
          </Button>
        </div>
      )}

      {createError && <p className="text-sm text-destructive">{createError}</p>}
      <Button
        type="submit"
        disabled={createBusy || !createTitle.trim() || (!isPaid && remaining === 0)}
      >
        {createBusy ? "Creating…" : "Create map"}
      </Button>
    </form>
  );
}