"use client";

import { useEffect, useId, useRef } from "react";

/**
 * A thin wrapper over the native <dialog> element. Opening calls showModal(),
 * which gives us the top layer, focus trapping, Escape-to-close and an inert
 * background for free. Closing marks the element so CSS can play a short exit
 * animation before hiding it.
 *
 * The exit flag is written straight to the DOM rather than held in state: it is
 * a one-shot visual hint, not something the render should depend on. All motion
 * lives in globals.css behind prefers-reduced-motion.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (open) {
      node.removeAttribute("data-closing");
      if (!node.open) node.showModal();
      return;
    }

    if (!node.open) return;

    // First (!) false after an open: close, animating when motion is allowed.
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      node.close();
      return;
    }

    node.setAttribute("data-closing", "true");
    const timer = window.setTimeout(() => {
      node.close();
      node.removeAttribute("data-closing");
    }, 170);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape: intercept so the exit animation can play first.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A press on the backdrop targets the dialog element itself.
        if (event.target === ref.current) onClose();
      }}
      className="dialog m-auto w-[min(92vw,34rem)] max-w-[calc(100vw-2rem)]"
    >
      <div className="max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-medium">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 -mt-1 rounded-md p-1 text-muted transition-colors hover:bg-accent/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </dialog>
  );
}
