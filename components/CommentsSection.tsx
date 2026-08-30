"use client";

import { useState } from "react";
import { addComment } from "@/lib/store";
import { useAuth } from "@/lib/AuthContext";

interface Comment {
  id: number;
  user_fk: number | null;
  authorName: string;
  text: string;
  date: string;
}

export function CommentsSection({
  reviewId,
  comments,
  onCommented,
}: {
  reviewId: number;
  comments: Comment[];
  onCommented: () => void;
}) {
  const { userId } = useAuth();
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    addComment(reviewId, t, userId);
    setText("");
    onCommented();
  };

  return (
    <div className="comments-section">
      {comments.length === 0 && (
        <p className="comments-empty">No replies yet.</p>
      )}
      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <span className="comment-author">
            <LinkToUser id={c.user_fk} name={c.authorName} />
          </span>
          <span className="comment-date">{c.date}</span>
          <p className="comment-text">{c.text}</p>
        </div>
      ))}
      <div className="comment-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Reply to this review…"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button type="button" className="action-btn2" onClick={submit}>
          Reply
        </button>
      </div>
    </div>
  );
}

function LinkToUser({
  id,
  name,
}: {
  id: number | null;
  name: string;
}) {
  if (id === null || id === undefined) {
    return <>{name}</>;
  }
  return <a href={`/users/${id}`}>{name}</a>;
}