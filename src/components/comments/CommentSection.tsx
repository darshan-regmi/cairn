"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCommentAction,
  deleteCommentAction,
  updateCommentAction,
} from "@/actions/comments";
import type { CommentTarget } from "@/lib/validation";

export type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  authorId: string;
  authorName: string | null;
  authorEmail: string;
};

const textareaClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

const buttonClass =
  "rounded-md border border-edge px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * A thread of comments on one item. Any project member can post; only the
 * author can edit or delete. The parent page remounts this component after a
 * change (via a key), so fresh props replace local state.
 */
export function CommentSection({
  targetType,
  targetId,
  currentUserId,
  initialComments,
  canComment = true,
}: {
  targetType: CommentTarget;
  targetId: string;
  currentUserId: string;
  initialComments: CommentItem[];
  canComment?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  function submitNew(form: HTMLFormElement) {
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createCommentAction({ success: false }, formData);
      if (result.success) {
        setError(null);
        form.reset();
        router.refresh();
      } else {
        setError(result.error ?? "Could not post the comment.");
      }
    });
  }

  function submitEdit(commentId: string) {
    const formData = new FormData();
    formData.set("commentId", commentId);
    formData.set("body", editBody);
    startTransition(async () => {
      const result = await updateCommentAction({ success: false }, formData);
      if (result.success) {
        setError(null);
        setEditingId(null);
        router.refresh();
      } else {
        setError(result.error ?? "Could not save the comment.");
      }
    });
  }

  function remove(commentId: string) {
    if (!window.confirm("Delete this comment?")) return;
    const formData = new FormData();
    formData.set("commentId", commentId);
    startTransition(async () => {
      const result = await deleteCommentAction({ success: false }, formData);
      if (result.success) {
        setError(null);
        router.refresh();
      } else {
        setError(result.error ?? "Could not delete the comment.");
      }
    });
  }

  return (
    <section className="rounded-lg border border-edge p-4" aria-label="Comments">
      <h3 className="text-sm font-medium">
        Comments
        {initialComments.length > 0 && (
          <span className="ml-2 text-xs font-normal text-muted">
            {initialComments.length}
          </span>
        )}
      </h3>

      {initialComments.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No comments yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {initialComments.map((comment) => {
            const mine = comment.authorId === currentUserId;
            const editing = editingId === comment.id;
            return (
              <li key={comment.id} className="rounded-md border border-edge p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {comment.authorName || comment.authorEmail}
                    {mine && (
                      <span className="ml-2 text-xs font-normal text-muted">
                        you
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted">
                    {formatDateTime(comment.createdAt)}
                    {comment.editedAt ? " · edited" : ""}
                  </span>
                </div>

                {editing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      rows={3}
                      maxLength={2000}
                      aria-label="Edit comment"
                      className={textareaClass}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => submitEdit(comment.id)}
                        disabled={pending}
                        className={buttonClass}
                      >
                        {pending ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-md px-3 py-1.5 text-sm text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
                )}

                {mine && !editing && (
                  <div className="mt-2 flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditBody(comment.body);
                      }}
                      className="rounded text-xs text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(comment.id)}
                      className="rounded text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canComment && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitNew(event.currentTarget);
          }}
          className="mt-4 space-y-2"
        >
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <label htmlFor={`comment-body-${targetId}`} className="sr-only">
            Add a comment
          </label>
          <textarea
            id={`comment-body-${targetId}`}
            name="body"
            required
            rows={3}
            maxLength={2000}
            placeholder="Add a comment…"
            className={textareaClass}
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-ink"
          >
            {pending ? "Posting…" : "Add comment"}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}