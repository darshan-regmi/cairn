// Agreed actions from a meeting are typed as free text, one per line. This
// turns that textarea into clean rows: bullet/number markers are stripped,
// blank lines dropped, and the result is capped so a paste can never create
// an unbounded number of rows.

export const MAX_ACTION_LINES = 50;
export const MAX_ACTION_LINE_LENGTH = 200;

export function parseActionLines(raw: unknown): string[] {
  if (typeof raw !== "string") return [];

  return raw
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*(?:[-*\u2022]|\d+[.)])\s*/, "")
        .trim()
        .slice(0, MAX_ACTION_LINE_LENGTH),
    )
    .filter((line) => line.length > 0)
    .slice(0, MAX_ACTION_LINES);
}
