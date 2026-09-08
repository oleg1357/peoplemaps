"use client";

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
    <form className="admin-create-map" onSubmit={onSubmit}>
      <h3>Create a new map</h3>
      <label className="admin-field">
        <span>Title</span>
        <input
          value={createTitle}
          onChange={(e) => setCreateTitle(e.target.value)}
          placeholder="e.g. Best Coffee in Copenhagen"
        />
      </label>
      <label className="admin-field">
        <span>Description (optional)</span>
        <input
          value={createDesc}
          onChange={(e) => setCreateDesc(e.target.value)}
          placeholder="What is this map about?"
        />
      </label>
      <label className="admin-field">
        <span>Visibility</span>
        <select
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
      </label>

      {!isPaid && (
        <div className="admin-quota">
          <span>
            Free plan: {publicMapCount} of {freePublicLimit} public maps used
            {remaining > 0 ? ` (${remaining} left)` : ""}.
          </span>
          <button type="button" className="action-btn2 upgrade-btn" disabled={upgradeBusy} onClick={onUpgrade}>
            {upgradeBusy ? "Opening checkout…" : "Upgrade to Pro"}
          </button>
          <span className="muted">Unlimited maps · private maps · priority support</span>
        </div>
      )}
      {isPaid && (
        <div className="admin-quota paid">
          <span>Pro plan — unlimited public and private maps.</span>
          <button type="button" className="action-btn2" disabled={manageBusy} onClick={onManage}>
            {manageBusy ? "Opening…" : "Manage subscription"}
          </button>
        </div>
      )}

      {createError && <p className="auth-error">{createError}</p>}
      <button
        type="submit"
        className="action-btn"
        disabled={createBusy || !createTitle.trim() || (!isPaid && remaining === 0)}
      >
        {createBusy ? "Creating…" : "Create map"}
      </button>
    </form>
  );
}