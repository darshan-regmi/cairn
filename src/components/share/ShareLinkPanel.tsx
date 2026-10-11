"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeShareLinkAction, saveShareLinkAction } from "@/actions/share";

const inputClass =
  "w-full rounded-md border border-edge bg-transparent px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

/**
 * Owner controls for the project's public, read-only link. No SMTP is
 * involved: the link itself is the delivery mechanism, so the owner can copy
 * it whenever they like and revoke it in one click.
 */
export function ShareLinkPanel({
  projectId,
  token,
  url,
  expiresAt,
  expired,
}: {
  projectId: string;
  token: string | null;
  url: string | null;
  expiresAt: string | null;
  expired: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveShareLinkAction({ success: false }, formData);
      if (result.success) {
        setError(null);
        router.refresh();
      } else {
        setError(result.error ?? "Could not save the link.");
      }
    });
  }

  function handleRevoke() {
    const formData = new FormData();
    formData.set("projectId", projectId);
    startTransition(async () => {
      const result = await revokeShareLinkAction({ success: false }, formData);
      if (result.success) {
        setError(null);
        setCopied(false);
        router.refresh();
      } else {
        setError(result.error ?? "Could not revoke the link.");
      }
    });
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError(null);
    } catch {
      setCopied(false);
      setError("Copy failed. Select the link and copy it manually.");
    }
  }

  return (
    <div className="rounded-lg border border-edge p-4">
      <h3 className="text-sm font-medium">Share link</h3>
      <p className="mt-1 text-sm text-muted">
        A read-only link you can send to anyone. They can view the milestones
        and tasks without an account, but cannot change anything.
      </p>

      {token && url && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              aria-label="Share link"
              onFocus={(event) => event.currentTarget.select()}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="shrink-0 rounded-md border border-edge px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Copy
            </button>
          </div>
          {copied && (
            <p role="status" className="text-xs text-muted">
              Copied to clipboard.
            </p>
          )}
          {expired && (
            <p className="text-xs text-red-700 dark:text-red-400">
              This link has expired. Set a new date, or clear it for no expiry.
            </p>
          )}
        </div>
      )}

      <form
        onSubmit={handleSave}
        noValidate
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <div>
          <label
            htmlFor={`${id}-expires`}
            className="block text-xs font-medium text-muted"
          >
            Expires (optional)
          </label>
          <input
            id={`${id}-expires`}
            name="expiresAt"
            type="date"
            defaultValue={expiresAt ?? ""}
            className={`${inputClass} mt-1`}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-edge px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {pending ? "Saving…" : token ? "Update expiry" : "Create link"}
        </button>
      </form>

      {token && (
        <div className="mt-3">
          <button
            type="button"
            onClick={handleRevoke}
            disabled={pending}
            className="rounded px-1 text-xs text-muted transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:text-red-400"
          >
            Revoke link
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
