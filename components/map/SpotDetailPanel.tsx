"use client";

import type { Spot, SpotStatus, Review, ReviewComment, SpotPhoto, SpotPhotoMeta } from "@/lib/types";
import { backendLive } from "@/lib/api-client";
import { MARKER_PRESETS, getMarkerColor } from "@/lib/markers";
import { reportSpot } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { selectInputCls } from "@/lib/utils";
import { cn } from "cn";

export interface SpotDetailBundle {
  reviews: Array<Review & { author: string; comments: Array<ReviewComment & { author: string }> }>;
  photos: SpotPhotoMeta[];
  avgScore: number | null;
}

export interface EditState {
  id: string;
  review: string;
  score: number;
}

interface SpotDetailPanelProps {
  selected: Spot;
  bundle: SpotDetailBundle;
  status: SpotStatus;
  onStatus: (s: SpotStatus) => void;
  userId: string | null;
  allowReviews?: boolean;
  allowComments?: boolean;
  allowPhotos?: boolean;
  editingSpot: boolean;
  setEditingSpot: (v: boolean) => void;
  startEditSpot: (spot: Spot) => void;
  handleSaveOwnSpot: (e: React.FormEvent) => void;
  editName: string;
  setEditName: (v: string) => void;
  editStreet: string;
  setEditStreet: (v: string) => void;
  editCity: string;
  setEditCity: (v: string) => void;
  editZip: number;
  setEditZip: (v: number) => void;
  editMarker: string | null;
  setEditMarker: (v: string | null) => void;
  editMarkerColor: string | null;
  setEditMarkerColor: (v: string | null) => void;
  editPriceLevel: number | null;
  setEditPriceLevel: (v: number | null) => void;
  editHoursNote: string;
  setEditHoursNote: (v: string) => void;
  editTagsText: string;
  setEditTagsText: (v: string) => void;
  editTip: string;
  setEditTip: (v: string) => void;
  editSpotError: string;
  editing: EditState | null;
  setEditing: (v: EditState | null) => void;
  reviewText: string;
  setReviewText: (v: string) => void;
  reviewScore: number;
  setReviewScore: (v: number) => void;
  handleSaveReview: () => void;
  handleVote: (reviewId: string) => void;
  handleDeleteReview: (reviewId: string) => void;
  handleEditReview: (reviewId: string, review: string, score: number) => void;
  commentDrafts: Record<string, string>;
  setCommentDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  replyTarget: { reviewId: string; commentId: string | null } | null;
  setReplyTarget: (v: { reviewId: string; commentId: string | null } | null) => void;
  handleComment: (reviewId: string, parentId: string | null) => void;
  handleDeleteComment: (commentId: string) => void;
  spotPhotos: Record<string, SpotPhoto[]>;
  photosLoading: boolean;
  handlePhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  reporting: boolean;
  setReporting: (v: boolean) => void;
  reportReason: string;
  setReportReason: (v: string) => void;
  reportDone: boolean;
  setReportDone: (v: boolean) => void;
  handleDeleteSpot: () => void;
  onClose: () => void;
}

export function SpotDetailPanel({
  selected,
  bundle,
  status,
  onStatus,
  userId,
  allowReviews,
  allowComments,
  allowPhotos,
  editingSpot,
  setEditingSpot,
  startEditSpot,
  handleSaveOwnSpot,
  editName,
  setEditName,
  editStreet,
  setEditStreet,
  editCity,
  setEditCity,
  editZip,
  setEditZip,
  editMarker,
  setEditMarker,
  editMarkerColor,
  setEditMarkerColor,
  editPriceLevel,
  setEditPriceLevel,
  editHoursNote,
  setEditHoursNote,
  editTagsText,
  setEditTagsText,
  editTip,
  setEditTip,
  editSpotError,
  editing,
  setEditing,
  reviewText,
  setReviewText,
  reviewScore,
  setReviewScore,
  handleSaveReview,
  handleVote,
  handleDeleteReview,
  handleEditReview,
  commentDrafts,
  setCommentDrafts,
  replyTarget,
  setReplyTarget,
  handleComment,
  handleDeleteComment,
  spotPhotos,
  photosLoading,
  handlePhoto,
  reporting,
  setReporting,
  reportReason,
  setReportReason,
  reportDone,
  setReportDone,
  handleDeleteSpot,
  onClose,
}: SpotDetailPanelProps) {
  const handleReport = async () => {
    if (!selected._id) return;
    await reportSpot(selected._id, reportReason);
    setReportReason("");
    setReporting(false);
    setReportDone(true);
    setTimeout(() => setReportDone(false), 3000);
  };

  return (
    <div
      id="details"
      className="absolute right-4 top-4 z-[9999] flex max-h-[calc(100vh-var(--header-h)-32px)] w-[380px] flex-col overflow-hidden rounded-[var(--radius-lg)] bg-surface text-ink shadow-(--shadow-lg)"
    >
      <div className="relative border-b border-border bg-surface-2 px-5 py-[18px]">
        <button
          type="button"
          id="closeDetails"
          className="absolute top-3 right-3.5 rounded-md border-none bg-ink/5 px-3 py-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-ink/10 hover:text-ink"
          onClick={onClose}
        >
          Close
        </button>
        <div className="flex items-center justify-end py-1.5">
          <h2 className="mt-0 mb-0 flex items-center gap-2.5 pr-[70px] text-[1.25em] font-bold leading-tight">
            {selected.name}
          </h2>
        </div>
        <p className="mt-1.5 mb-0 text-muted-foreground">
          {selected.street || "No address"} {selected.city && `, ${selected.city}`}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="inline-flex gap-0.5 rounded-none bg-chip p-[3px]">
            {(["open", "closed", "unknown"] as SpotStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                className={cn(
                  "cursor-pointer rounded-none border-none bg-transparent px-3 py-[5px] text-[12.5px] font-semibold text-muted-foreground transition-colors",
                  status === s
                    ? s === "open"
                      ? "bg-green text-white hover:text-white"
                      : s === "closed"
                        ? "bg-(--danger-2) text-white hover:text-white"
                        : "bg-muted-foreground text-white hover:text-white"
                    : "hover:text-ink"
                )}
                onClick={() => onStatus(s)}
              >
                {s === "open" ? "Open" : s === "closed" ? "Closed" : "Unknown"}
              </button>
            ))}
          </div>
        </div>
        {(selected.priceLevel !== undefined && selected.priceLevel !== null) ||
        selected.hoursNote ||
        (selected.tags && selected.tags.length > 0) ||
        selected.tip ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
            {selected.priceLevel !== undefined && selected.priceLevel !== null && (
              <span className="inline-flex items-center gap-1.5" title="Price level">
                {"$".repeat(Math.max(1, selected.priceLevel + 1))}
              </span>
            )}
            {selected.hoursNote && (
              <span className="inline-flex items-center gap-1.5">🕒 {selected.hoursNote}</span>
            )}
            {selected.tags && selected.tags.length > 0 && (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                {selected.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-block rounded-none border border-border bg-chip px-2 py-[1px] text-xs"
                  >
                    {t}
                  </span>
                ))}
              </span>
            )}
            {selected.tip && <p className="spot-tip">💡 {selected.tip}</p>}
          </div>
        ) : null}
        {userId && selected.createdBy === userId && (
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-green-dark hover:bg-green/10 hover:text-green-dark"
              onClick={() => (editingSpot ? setEditingSpot(false) : startEditSpot(selected))}
            >
              {editingSpot ? "Cancel" : "Edit spot"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDeleteSpot}
            >
              Delete
            </Button>
          </div>
        )}
        {userId && selected.createdBy !== userId && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {reporting ? (
              <>
                <Input
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Reason…"
                  className="min-w-[140px] flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-green-dark hover:bg-green/10 hover:text-green-dark"
                  onClick={handleReport}
                >
                  Submit report
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setReporting(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-green-dark hover:bg-green/10 hover:text-green-dark"
                onClick={() => setReporting(true)}
              >
                {reportDone ? "Reported ✓" : "Report"}
              </Button>
            )}
          </div>
        )}
      </div>

      <div id="details-content" className="overflow-y-auto p-5">
        {editingSpot ? (
          <form
            onSubmit={handleSaveOwnSpot}
            className="flex w-auto flex-col gap-2.5 border border-border bg-surface p-4 text-ink shadow-(--shadow-lg)"
          >
            <strong className="text-[15px] font-bold">Edit spot</strong>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Spot name" />
            <Input value={editStreet} onChange={(e) => setEditStreet(e.target.value)} placeholder="Street" />
            <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="City" />
            <Input
              value={editZip}
              type="number"
              onChange={(e) => setEditZip(Number(e.target.value))}
              placeholder="Zip"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select
                value={editPriceLevel === null ? "" : editPriceLevel}
                onChange={(e) => setEditPriceLevel(e.target.value ? Number(e.target.value) : null)}
                title="Price level"
                className={selectInputCls}
              >
                <option value="">Price (optional)</option>
                <option value="0">$ — cheap</option>
                <option value="1">$$ — moderate</option>
                <option value="2">$$$ — upscale</option>
                <option value="3">$$$$ — premium</option>
              </select>
              <Input value={editHoursNote} onChange={(e) => setEditHoursNote(e.target.value)} placeholder="Hours (e.g. Mon–Fri 08:00–18:00)" />
              <Input value={editTagsText} onChange={(e) => setEditTagsText(e.target.value)} placeholder="Tags (comma separated)" />
              <Textarea value={editTip} onChange={(e) => setEditTip(e.target.value)} rows={2} placeholder="Insider tip (e.g. best time to visit)" className="col-span-2" />
            </div>
            <div className="marker-picker-inline">
              {MARKER_PRESETS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.label}
                  className={`marker-opt ${m.emoji === (editMarker ?? selected.marker) ? "active" : ""}`}
                  onClick={() => {
                    setEditMarker(m.emoji);
                    setEditMarkerColor(m.color);
                  }}
                >
                  {m.emoji}
                </button>
              ))}
              <input
                type="color"
                value={getMarkerColor(editMarkerColor ?? selected.markerColor ?? "")}
                onChange={(e) => setEditMarkerColor(e.target.value)}
                title="Custom color"
              />
            </div>
            {editSpotError && <span className="text-[13px] text-destructive">{editSpotError}</span>}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={!editName.trim()}>
                Save changes
              </Button>
            </div>
          </form>
        ) : !editing ? (
          <>
            {allowReviews === false ? (
              <p className="italic muted">Reviews are disabled for this map.</p>
            ) : (
              <>
                <h3 className="mt-0 mb-2 text-base font-bold">Add a review</h3>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="How was your visit?"
                  rows={2}
                  className="w-full"
                />
                <div className="my-2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Score</span>
                  <select value={reviewScore} onChange={(e) => setReviewScore(Number(e.target.value))} className={cn(selectInputCls, "w-auto")}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" size="sm" onClick={handleSaveReview}>
                    Submit review
                  </Button>
                </div>
              </>
            )}

            <div id="reviews-box" className="max-h-80 overflow-y-auto">
              {bundle.avgScore !== null && (
                <div className="mb-3.5 flex items-center gap-2.5 border border-border bg-chip p-2.5">
                  <span className="text-xl font-bold text-ink">
                    {bundle.avgScore.toFixed(1)}
                  </span>
                  <span className="inline-flex gap-px text-base">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={n <= Math.round(bundle.avgScore as number) ? "text-warning" : "text-border"}
                      >
                        ★
                      </span>
                    ))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    from {bundle.reviews.length} review{bundle.reviews.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}
              {bundle.reviews.map((r) => (
                <div id="reviews" key={r._id} className="border-t border-border py-3 text-right">
                  <div className="review-head">
                    <span className="review-score">{r.score}/5</span>
                    <span className="review-author">{r.author}</span>
                    <span id="review-date" className="text-xs text-muted-foreground">{r.date}</span>
                  </div>
                  <p className="mt-1.5 mb-0">{r.review || <span className="italic">No review</span>}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1 rounded-none border bg-chip px-2.5 py-1 text-xs font-semibold transition-colors",
                        r.voted
                          ? "border-green/40 bg-green/15 text-green-dark"
                          : "border-transparent text-muted-foreground hover:text-green-dark"
                      )}
                      onClick={() => r._id && handleVote(r._id)}
                    >
                      Helpful{r.helpfulCount ? ` (${r.helpfulCount})` : ""}
                    </button>
                    {r._id && allowComments !== false && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-green-dark hover:bg-green/10 hover:text-green-dark"
                        onClick={() =>
                          setReplyTarget({ reviewId: r._id as string, commentId: null })
                        }
                      >
                        Reply
                      </Button>
                    )}
                    {r._id && Boolean(userId) && r.user_fk === userId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-green-dark hover:bg-green/10 hover:text-green-dark"
                        onClick={() => setEditing({ id: r._id as string, review: r.review, score: r.score })}
                      >
                        Edit
                      </Button>
                    )}
                    {r._id && Boolean(userId) && r.user_fk === userId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteReview(r._id!)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                  <div className="mt-2.5 border border-border bg-surface-2 p-2.5 text-left">
                    {(() => {
                      const byParent = new Map<
                        string,
                        (typeof r.comments)[number][]
                      >();
                      const roots: (typeof r.comments)[number][] = [];
                      r.comments.forEach((c) => {
                        if (c.parentId && c._id) {
                          let arr = byParent.get(c.parentId);
                          if (!arr) { arr = []; byParent.set(c.parentId, arr); }
                          arr.push(c);
                        } else {
                          roots.push(c);
                        }
                      });
                      const renderComment = (
                        c: (typeof r.comments)[number],
                        depth: number
                      ) => {
                        const children: (typeof r.comments)[number][] =
                          c._id ? (byParent.get(c._id) ?? []) : [];
                        const key = `${r._id}:${c._id ?? "root"}`;
                        const mine =
                          Boolean(userId) && c.user_fk === userId;
                        return (
                          <div
                            key={c._id}
                            className={cn(
                              "mb-2 pb-2",
                              depth === 0 && "border-b border-border"
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-[12.5px] font-bold text-ink">{c.author}</strong>
                              <span className="text-[11px] text-muted-foreground">{c.date}</span>
                              {mine && (
                                <Button
                                  type="button"
                                  variant="link"
                                  className="h-auto p-0 text-xs text-destructive hover:text-destructive"
                                  onClick={() => c._id && handleDeleteComment(c._id)}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                            <p className="mt-0.5 mb-0 text-[13px] text-ink">{c.text}</p>
                            {r._id && allowComments !== false && (
                              <Button
                                type="button"
                                variant="link"
                                className="mt-0.5 h-auto p-0 text-xs"
                                onClick={() =>
                                  setReplyTarget({
                                    reviewId: r._id as string,
                                    commentId: c._id ?? null,
                                  })
                                }
                              >
                                Reply
                              </Button>
                            )}
                            {r._id &&
                              replyTarget?.reviewId === r._id &&
                              replyTarget.commentId === c._id && (
                                <div className="mt-2 flex gap-2">
                                  <Input
                                    autoFocus
                                    value={commentDrafts[key] || ""}
                                    onChange={(e) =>
                                      setCommentDrafts((d) => ({ ...d, [key]: e.target.value }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleComment(r._id as string, c._id ?? null);
                                      }
                                    }}
                                    placeholder="Write a reply…"
                                    className="h-9 flex-1 text-[13px]"
                                  />
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto p-0 text-xs"
                                    onClick={() =>
                                      handleComment(r._id as string, c._id ?? null)
                                    }
                                  >
                                    Reply
                                  </Button>
                                </div>
                              )}
                            {children.length > 0 && (
                              <div className="mt-2.5 ml-4 border-l-2 border-border pl-3">
                                {children.map((ch) =>
                                  renderComment(ch, depth + 1)
                                )}
                              </div>
                            )}
                          </div>
                        );
                      };
                      return (
                        <>
                          {roots.map((c) => renderComment(c, 0))}
                          {r.comments.length === 0 && (
                            <p className="italic muted mt-0 mb-0">
                              No comments yet.
                            </p>
                          )}
                          {r._id &&
                            replyTarget?.reviewId === r._id &&
                            replyTarget.commentId === null && (
                              <div className="mt-2 flex gap-2">
                                <Input
                                  autoFocus
                                  value={commentDrafts[`${r._id}:root`] || ""}
                                  onChange={(e) =>
                                    setCommentDrafts((d) => ({
                                      ...d,
                                      [`${r._id as string}:root`]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleComment(r._id as string, null);
                                    }
                                  }}
                                  placeholder="Write a reply…"
                                  className="h-9 flex-1 text-[13px]"
                                />
                                <Button
                                  type="button"
                                  variant="link"
                                  className="h-auto p-0 text-xs"
                                  onClick={() => handleComment(r._id as string, null)}
                                >
                                  Reply
                                </Button>
                              </div>
                            )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
              {bundle.reviews.length === 0 && (
                <p className="italic mb-0">No reviews yet — be the first!</p>
              )}
            </div>
          </>
        ) : (
          <div>
            <h3 className="mt-0 mb-2 text-base font-bold">Edit review</h3>
            <Textarea
              value={editing.review}
              onChange={(e) => setEditing({ ...editing, review: e.target.value })}
              rows={2}
              className="w-full"
            />
            <select
              value={editing.score}
              onChange={(e) => setEditing({ ...editing, score: Number(e.target.value) })}
              className={cn(selectInputCls, "my-2 w-auto")}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleEditReview(editing.id, editing.review, editing.score)}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
          </div>
        )}

        <h3 className="mt-4 mb-2 text-base font-bold">Photos ({bundle.photos.length})</h3>
        <div className="flex flex-wrap gap-2">
          {(() => {
            if (backendLive) {
              const loaded = selected?._id ? spotPhotos[selected._id] ?? [] : [];
              if (loaded.length === 0 && photosLoading) {
                return <span className="italic">Loading photos…</span>;
              }
              return loaded.map((p) => (
                <img key={p._id} src={p.dataUrl} alt="spot" className="h-[88px] w-[88px] rounded-none border border-border object-cover shadow-(--shadow-sm)" />
              ));
            }
            // Demo mode: mapData.photos already carry the image bytes.
            return (bundle.photos as SpotPhoto[]).map((p) => (
              <img key={p._id} src={p.dataUrl} alt="spot" className="h-[88px] w-[88px] rounded-none border border-border object-cover shadow-(--shadow-sm)" />
            ));
          })()}
        </div>
        {allowPhotos === false ? (
          <p className="italic muted">Photo uploads are disabled for this map.</p>
        ) : (
          <Input type="file" accept="image/*" onChange={handlePhoto} className="mt-2 max-w-[280px]" />
        )}
      </div>
    </div>
  );
}