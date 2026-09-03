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
}) {
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
          <option value="private">Private — owner only</option>
        </select>
      </label>
      {createError && <p className="auth-error">{createError}</p>}
      <button type="submit" className="action-btn" disabled={createBusy || !createTitle.trim()}>
        {createBusy ? "Creating…" : "Create map"}
      </button>
    </form>
  );
}
