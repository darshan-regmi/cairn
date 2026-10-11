import { describe, expect, it } from "vitest";
import {
  groupCommentsByTarget,
  toCommentItem,
  type CommentRow,
} from "@/lib/comments";

function row(overrides: Partial<CommentRow> = {}): CommentRow {
  return {
    id: "c1",
    targetId: "t1",
    body: "Hello",
    createdAt: new Date("2026-06-01T10:00:00Z"),
    editedAt: null,
    authorId: "u1",
    author: { name: "Ada", email: "ada@example.com" },
    ...overrides,
  };
}

describe("toCommentItem", () => {
  it("serialises the dates and the author", () => {
    const item = toCommentItem(row());
    expect(item.createdAt).toBe("2026-06-01T10:00:00.000Z");
    expect(item.editedAt).toBeNull();
    expect(item.authorName).toBe("Ada");
    expect(item.authorEmail).toBe("ada@example.com");
  });

  it("keeps the edited timestamp when present", () => {
    const item = toCommentItem(
      row({ editedAt: new Date("2026-06-02T09:30:00Z") }),
    );
    expect(item.editedAt).toBe("2026-06-02T09:30:00.000Z");
  });
});

describe("groupCommentsByTarget", () => {
  it("groups rows by targetId and preserves order", () => {
    const grouped = groupCommentsByTarget([
      row({ id: "a", targetId: "t1", body: "first" }),
      row({ id: "b", targetId: "t2", body: "second" }),
      row({ id: "c", targetId: "t1", body: "third" }),
    ]);

    expect(Object.keys(grouped).sort()).toEqual(["t1", "t2"]);
    expect(grouped.t1?.map((comment) => comment.id)).toEqual(["a", "c"]);
    expect(grouped.t2?.map((comment) => comment.id)).toEqual(["b"]);
  });

  it("returns an empty object when there are no rows", () => {
    expect(groupCommentsByTarget([])).toEqual({});
  });
});
