// Shape-mapping for comment threads. Kept out of the client component so
// server pages can build the serialisable props CommentSection expects.
import type { CommentItem } from "@/components/comments/CommentSection";

export type CommentRow = {
  id: string;
  targetId: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  authorId: string;
  author: { name: string | null; email: string };
};

export function toCommentItem(row: CommentRow): CommentItem {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    authorId: row.authorId,
    authorName: row.author.name,
    authorEmail: row.author.email,
  };
}

export function toCommentItems(rows: CommentRow[]): CommentItem[] {
  return rows.map(toCommentItem);
}

/** Group a multi-target comment query by targetId, ready to pass to a page. */
export function groupCommentsByTarget(
  rows: CommentRow[],
): Record<string, CommentItem[]> {
  const byTarget: Record<string, CommentItem[]> = {};
  for (const row of rows) {
    (byTarget[row.targetId] ??= []).push(toCommentItem(row));
  }
  return byTarget;
}
