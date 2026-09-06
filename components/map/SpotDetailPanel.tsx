"use client";

import type { Spot, SpotStatus, Review, ReviewComment, SpotPhoto, SpotPhotoMeta } from "@/lib/types";
import { backendLive } from "@/lib/api-client";
import { MARKER_PRESETS, getMarkerColor } from "@/lib/markers";
import { reportSpot } from "@/lib/api-client";

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
    <div id="details">
      <div className="details-top">
        <button type="button" id="closeDetails" className="close-btn" onClick={onClose}>
          Close
        </button>
        <div className="flex">
          <h2 style={{ margin: 0 }}>{selected.name}</h2>
        </div>
        <p style={{ margin: "6px 0 0" }}>
          {selected.street || "No address"} {selected.city && `, ${selected.city}`}
        </p>
        <div className="status-row">
          <div className="status-control">
            {(["open", "closed", "unknown"] as SpotStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`status-btn ${s} ${status === s ? "active" : ""}`}
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
          <div className="spot-meta">
            {selected.priceLevel !== undefined && selected.priceLevel !== null && (
              <span className="spot-meta-item" title="Price level">
                {"$".repeat(Math.max(1, selected.priceLevel + 1))}
              </span>
            )}
            {selected.hoursNote && (
              <span className="spot-meta-item">🕒 {selected.hoursNote}</span>
            )}
            {selected.tags && selected.tags.length > 0 && (
              <span className="spot-meta-item">
                {selected.tags.map((t) => (
                  <span key={t} className="spot-tag">
                    {t}
                  </span>
                ))}
              </span>
            )}
            {selected.tip && <p className="spot-tip">💡 {selected.tip}</p>}
          </div>
        ) : null}
        {userId && selected.createdBy === userId && (
          <div className="status-row" style={{ gap: 8 }}>
            <button
              type="button"
              className="link-btn"
              onClick={() => (editingSpot ? setEditingSpot(false) : startEditSpot(selected))}
            >
              {editingSpot ? "Cancel" : "Edit spot"}
            </button>
            <button type="button" className="link-btn danger" onClick={handleDeleteSpot}>
              Delete
            </button>
          </div>
        )}
        {userId && selected.createdBy !== userId && (
          <div className="status-row" style={{ gap: 8, flexWrap: "wrap" }}>
            {reporting ? (
              <>
                <input
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Reason…"
                  style={{ flex: 1, minWidth: 140 }}
                />
                <button type="button" className="link-btn" onClick={handleReport}>
                  Submit report
                </button>
                <button type="button" className="link-btn" onClick={() => setReporting(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="link-btn" onClick={() => setReporting(true)}>
                {reportDone ? "Reported ✓" : "Report"}
              </button>
            )}
          </div>
        )}
      </div>

      <div id="details-content">
        {editingSpot ? (
          <form onSubmit={handleSaveOwnSpot} className="map-draw-card" style={{ position: "static", width: "auto" }}>
            <strong>Edit spot</strong>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Spot name" />
            <input value={editStreet} onChange={(e) => setEditStreet(e.target.value)} placeholder="Street" />
            <input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="City" />
            <input
              value={editZip}
              type="number"
              onChange={(e) => setEditZip(Number(e.target.value))}
              placeholder="Zip"
            />
            <div className="spot-form-grid">
              <select
                value={editPriceLevel === null ? "" : editPriceLevel}
                onChange={(e) => setEditPriceLevel(e.target.value ? Number(e.target.value) : null)}
                title="Price level"
              >
                <option value="">Price (optional)</option>
                <option value="0">$ — cheap</option>
                <option value="1">$$ — moderate</option>
                <option value="2">$$$ — upscale</option>
                <option value="3">$$$$ — premium</option>
              </select>
              <input value={editHoursNote} onChange={(e) => setEditHoursNote(e.target.value)} placeholder="Hours (e.g. Mon–Fri 08:00–18:00)" />
              <input value={editTagsText} onChange={(e) => setEditTagsText(e.target.value)} placeholder="Tags (comma separated)" />
              <textarea value={editTip} onChange={(e) => setEditTip(e.target.value)} rows={2} placeholder="Insider tip (e.g. best time to visit)" />
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
            {editSpotError && <span className="map-error">{editSpotError}</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="submit" className="action-btn2" disabled={!editName.trim()}>
                Save changes
              </button>
            </div>
          </form>
        ) : !editing ? (
          <>
            {allowReviews === false ? (
              <p className="italic muted">Reviews are disabled for this map.</p>
            ) : (
              <>
                <h3>Add a review</h3>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="How was your visit?"
                  rows={2}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
                  <span>Score</span>
                  <select value={reviewScore} onChange={(e) => setReviewScore(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="action-btn2" onClick={handleSaveReview}>
                    Submit review
                  </button>
                </div>
              </>
            )}

            <div id="reviews-box">
              {bundle.avgScore !== null && (
                <div className="avg-rating">
                  <span className="avg-rating-score">
                    {bundle.avgScore.toFixed(1)}
                  </span>
                  <span className="avg-rating-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={n <= Math.round(bundle.avgScore as number) ? "on" : ""}
                      >
                        ★
                      </span>
                    ))}
                  </span>
                  <span className="avg-rating-count">
                    from {bundle.reviews.length} review{bundle.reviews.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}
              {bundle.reviews.map((r) => (
                <div id="reviews" key={r._id}>
                  <div className="review-head">
                    <span className="review-score">{r.score}/5</span>
                    <span className="review-author">{r.author}</span>
                    <span id="review-date">{r.date}</span>
                  </div>
                  <p style={{ margin: "6px 0" }}>{r.review || <span className="italic">No review</span>}</p>
                  <div className="review-actions">
                    <button
                      type="button"
                      className={`helpful-btn ${r.voted ? "voted" : ""}`}
                      onClick={() => r._id && handleVote(r._id)}
                    >
                      Helpful{r.helpfulCount ? ` (${r.helpfulCount})` : ""}
                    </button>
                    {r._id && allowComments !== false && (
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() =>
                          setReplyTarget({ reviewId: r._id as string, commentId: null })
                        }
                      >
                        Reply
                      </button>
                    )}
                    {r._id && Boolean(userId) && r.user_fk === userId && (
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setEditing({ id: r._id as string, review: r.review, score: r.score })}
                      >
                        Edit
                      </button>
                    )}
                    {r._id && Boolean(userId) && r.user_fk === userId && (
                      <button type="button" className="link-btn danger" onClick={() => handleDeleteReview(r._id!)}>
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="comments-section">
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
                            className={`comment ${depth > 0 ? "reply" : ""}`}
                          >
                            <div className="comment-head">
                              <strong>{c.author}</strong>
                              <span className="comment-date">{c.date}</span>
                              {mine && (
                                <button
                                  type="button"
                                  className="link-btn danger"
                                  onClick={() => c._id && handleDeleteComment(c._id)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                            <p className="comment-text">{c.text}</p>
                            {r._id && allowComments !== false && (
                              <button
                                type="button"
                                className="link-btn comment-reply-btn"
                                onClick={() =>
                                  setReplyTarget({
                                    reviewId: r._id as string,
                                    commentId: c._id ?? null,
                                  })
                                }
                              >
                                Reply
                              </button>
                            )}
                            {r._id &&
                              replyTarget?.reviewId === r._id &&
                              replyTarget.commentId === c._id && (
                                <div className="add-comment">
                                  <input
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
                                  />
                                  <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() =>
                                      handleComment(r._id as string, c._id ?? null)
                                    }
                                  >
                                    Reply
                                  </button>
                                </div>
                              )}
                            {children.length > 0 && (
                              <div className="comment-nested">
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
                            <p className="italic muted">
                              No comments yet.
                            </p>
                          )}
                          {r._id &&
                            replyTarget?.reviewId === r._id &&
                            replyTarget.commentId === null && (
                              <div className="add-comment">
                                <input
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
                                />
                                <button
                                  type="button"
                                  className="link-btn"
                                  onClick={() => handleComment(r._id as string, null)}
                                >
                                  Reply
                                </button>
                              </div>
                            )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
              {bundle.reviews.length === 0 && (
                <p className="italic">No reviews yet — be the first!</p>
              )}
            </div>
          </>
        ) : (
          <div>
            <h3>Edit review</h3>
            <textarea
              value={editing.review}
              onChange={(e) => setEditing({ ...editing, review: e.target.value })}
              rows={2}
              style={{ width: "100%" }}
            />
            <select
              value={editing.score}
              onChange={(e) => setEditing({ ...editing, score: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button type="button" className="action-btn2" onClick={() => handleEditReview(editing.id, editing.review, editing.score)}>
              Save
            </button>
            <button type="button" className="link-btn" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        )}

        <h3 style={{ marginTop: 16 }}>Photos ({bundle.photos.length})</h3>
        <div className="photos-grid">
          {(() => {
            if (backendLive) {
              const loaded = selected?._id ? spotPhotos[selected._id] ?? [] : [];
              if (loaded.length === 0 && photosLoading) {
                return <span className="italic">Loading photos…</span>;
              }
              return loaded.map((p) => (
                <img key={p._id} src={p.dataUrl} alt="spot" className="spot-photo" />
              ));
            }
            // Demo mode: mapData.photos already carry the image bytes.
            return (bundle.photos as SpotPhoto[]).map((p) => (
              <img key={p._id} src={p.dataUrl} alt="spot" className="spot-photo" />
            ));
          })()}
        </div>
        {allowPhotos === false ? (
          <p className="italic muted">Photo uploads are disabled for this map.</p>
        ) : (
          <input type="file" accept="image/*" onChange={handlePhoto} />
        )}
      </div>
    </div>
  );
}
